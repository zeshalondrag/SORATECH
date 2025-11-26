using DotNetEnv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using soratech_api.Models;
using soratech_api.Models.DTO;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Npgsql;

namespace soratech_api.Controllers;

/// <summary>
/// Контроллер для аутентификации и авторизации пользователей
/// </summary>
/// <remarks>
/// Управление аутентификацией: вход, регистрация, валидация токена, обновление профиля, сброс пароля.
/// Использует JWT токены для авторизации и PostgreSQL pgcrypto для хеширования паролей.
/// </remarks>
[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly SoraTechDbContext _context;
    private readonly string _jwtKey;
    private readonly string _issuer = "SoraTechApi";
    private readonly string _audience = "SoraTechApi";

    public AuthController(SoraTechDbContext context)
    {
        _context = context;
        _jwtKey = Env.GetString("JWT_KEY");
    }

    /// <summary>
    /// Вход в систему
    /// </summary>
    /// <param name="loginDto">Данные для входа (email и пароль)</param>
    /// <returns>JWT токен и информация о пользователе</returns>
    /// <response code="200">Успешный вход, возвращает JWT токен и данные пользователя</response>
    /// <response code="400">Некорректные данные (email или пароль не указаны)</response>
    /// <response code="401">Неверный email или пароль</response>
    /// <response code="500">Внутренняя ошибка сервера</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        var debugLog = new List<string>();
        debugLog.Add($"➡️ Login attempt for: {loginDto.Email}");

        if (loginDto == null || string.IsNullOrEmpty(loginDto.Email) || string.IsNullOrEmpty(loginDto.Password))
            return BadRequest(new { message = "Email и пароль обязательны", debug = debugLog });

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

        if (user == null)
        {
            debugLog.Add("❌ Пользователь не найден");
            return Unauthorized(new { message = "Неверный email или пароль", debug = debugLog });
        }

        debugLog.Add($"✅ Пользователь найден: ID={user.Id}, Email={user.Email}");
        debugLog.Add("🧠 Проверка пароля через pgcrypto...");

        // ✅ ПРАВИЛЬНАЯ проверка пароля через прямое SQL-выполнение
        bool isValidPassword = false;
        try
        {
            var connString = _context.Database.GetConnectionString();
            await using (var conn = new Npgsql.NpgsqlConnection(connString))
            {
                await conn.OpenAsync();
                await using (var cmd = new Npgsql.NpgsqlCommand(
                    "SELECT (crypt(@password, @hash) = @hash)", conn))
                {
                    cmd.Parameters.AddWithValue("@password", loginDto.Password);
                    cmd.Parameters.AddWithValue("@hash", user.PasswordHash);
                    var result = await cmd.ExecuteScalarAsync();
                    isValidPassword = result is bool b && b;
                }
            }
        }
        catch (Exception ex)
        {
            debugLog.Add($"❌ Ошибка при проверке пароля: {ex.Message}");
            return StatusCode(500, new { message = "Ошибка проверки пароля", debug = debugLog });
        }

        debugLog.Add($"🔐 Результат проверки пароля: {isValidPassword}");

        if (!isValidPassword)
        {
            debugLog.Add("❌ Пароль не совпадает с хэшем в БД");
            return Unauthorized(new { message = "Неверный email или пароль", debug = debugLog });
        }

        var role = await _context.Roles
            .Where(r => r.Id == user.RoleId)
            .Select(r => r.RoleName)
            .FirstOrDefaultAsync();

        if (role == null)
        {
            debugLog.Add("⚠️ Роль пользователя не найдена");
            return StatusCode(500, new { message = "Роль пользователя не найдена", debug = debugLog });
        }

        // JWT токен
        var claims = new[]
        {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString() ?? ""),
        new Claim(ClaimTypes.Name, user.FirstName),
        new Claim("nickname", user.Nickname ?? ""),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.MobilePhone, user.Phone),
        new Claim(ClaimTypes.Role, role)
    };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.Now.AddHours(2),
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        debugLog.Add("✅ Авторизация успешна, токен выдан");

        return Ok(new
        {
            token = tokenString,
            user = new
            {
                id = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                nickname = user.Nickname,
                phone = user.Phone,
                role = role
            },
            debug = debugLog
        });
    }

    /// <summary>
    /// Регистрация нового пользователя
    /// </summary>
    /// <param name="registerDto">Данные для регистрации (email, пароль, имя, телефон)</param>
    /// <returns>JWT токен и информация о пользователе</returns>
    /// <response code="200">Пользователь успешно зарегистрирован, возвращает JWT токен и данные пользователя</response>
    /// <response code="400">Некорректные данные (не все поля заполнены, email или телефон уже заняты)</response>
    /// <response code="500">Внутренняя ошибка сервера</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        if (registerDto == null || string.IsNullOrEmpty(registerDto.Email) ||
            string.IsNullOrEmpty(registerDto.Password) || string.IsNullOrEmpty(registerDto.FirstName) ||
            string.IsNullOrEmpty(registerDto.Phone))
        {
            return BadRequest("Все поля обязательны");
        }

        if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
            return BadRequest("Email уже занят");

        if (await _context.Users.AnyAsync(u => u.Phone == registerDto.Phone))
            return BadRequest("Телефон уже занят");

        var clientRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Клиент");
        if (clientRole == null)
            return StatusCode(500, "Роль 'Клиент' не найдена");

        // 🔐 Хешируем пароль через PostgreSQL crypt()
        string? hashedPassword = null;
        try
        {
            var connString = _context.Database.GetConnectionString();
            await using (var conn = new Npgsql.NpgsqlConnection(connString))
            {
                await conn.OpenAsync();
                await using (var cmd = new Npgsql.NpgsqlCommand(
                    "SELECT crypt(@password, gen_salt('bf'))", conn))
                {
                    cmd.Parameters.AddWithValue("@password", registerDto.Password);
                    var result = await cmd.ExecuteScalarAsync();
                    hashedPassword = result?.ToString();
                }
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка при хешировании пароля: {ex.Message}");
        }

        if (string.IsNullOrEmpty(hashedPassword))
            return StatusCode(500, "Не удалось сгенерировать хеш пароля");

        var user = new User
        {
            RoleId = clientRole.Id ?? 0,
            Email = registerDto.Email,
            PasswordHash = hashedPassword,
            FirstName = registerDto.FirstName,
            Phone = registerDto.Phone,
            RegistrationDate = DateOnly.FromDateTime(DateTime.Now)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // ✅ Автоматически авторизуем пользователя после регистрации
        // Получаем роль для JWT
        var role = await _context.Roles
            .Where(r => r.Id == user.RoleId)
            .Select(r => r.RoleName)
            .FirstOrDefaultAsync();

        if (role == null)
            return StatusCode(500, "Роль пользователя не найдена");

        // Формируем JWT токен
        var claims = new[]
        {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString() ?? ""),
        new Claim(ClaimTypes.Name, user.FirstName),
        new Claim("nickname", user.Nickname ?? ""),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.MobilePhone, user.Phone),
        new Claim(ClaimTypes.Role, role)
    };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.Now.AddHours(2),
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        // ✅ Возвращаем тот же формат, что и Login
        return Ok(new
        {
            token = tokenString,
            user = new
            {
                id = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                nickname = user.Nickname,
                phone = user.Phone,
                role = role
            }
        });
    }

    /// <summary>
    /// Валидация JWT токена
    /// </summary>
    /// <returns>Информация о пользователе из токена</returns>
    /// <response code="200">Токен валиден, возвращает информацию о пользователе</response>
    /// <response code="401">Токен недействителен или отсутствует</response>
    [HttpGet("validate")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [Authorize]
    public IActionResult ValidateToken()
    {
        var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var firstname = User.FindFirst(ClaimTypes.Name)?.Value;
        var nickname = User.FindFirst("nickname")?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var phone = User.FindFirst(ClaimTypes.MobilePhone)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        return Ok(new
        {
            Id = id,
            FirstName = firstname,
            Nickname = nickname,
            Email = email,
            Phone = phone,
            Role = role,
            IsValid = true
        });
    }

    /// <summary>
    /// Обновить профиль пользователя
    /// </summary>
    /// <param name="id">Идентификатор пользователя</param>
    /// <param name="updated">Обновленные данные профиля</param>
    /// <returns>Результат операции</returns>
    /// <response code="204">Профиль успешно обновлен</response>
    /// <response code="401">Не авторизован</response>
    /// <response code="404">Пользователь не найден</response>
    [HttpPut("updateProfile/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [Authorize]
    public async Task<IActionResult> PutUser(int id, UserUpdateDto updated)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        user.FirstName = updated.FirstName;
        user.Nickname = updated.Nickname;
        user.Phone = updated.Phone;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Сбросить пароль пользователя
    /// </summary>
    /// <param name="dto">Данные для сброса пароля (email и новый пароль)</param>
    /// <returns>Результат операции</returns>
    /// <response code="200">Пароль успешно обновлен</response>
    /// <response code="400">Некорректные данные</response>
    /// <response code="404">Пользователь не найден</response>
    /// <response code="500">Ошибка при хешировании пароля</response>
    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (dto == null || string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.NewPassword))
            return BadRequest("Некорректные данные");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return NotFound("Пользователь не найден");

        // 🔐 Хешируем пароль через PostgreSQL crypt()
        string? hashedPassword = null;
        try
        {
            var connString = _context.Database.GetConnectionString();
            await using (var conn = new Npgsql.NpgsqlConnection(connString))
            {
                await conn.OpenAsync();
                await using (var cmd = new Npgsql.NpgsqlCommand(
                    "SELECT crypt(@password, gen_salt('bf'))", conn))
                {
                    cmd.Parameters.AddWithValue("@password", dto.NewPassword);
                    var result = await cmd.ExecuteScalarAsync();
                    hashedPassword = result?.ToString();
                }
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка при хешировании пароля: {ex.Message}");
        }

        if (string.IsNullOrEmpty(hashedPassword))
            return StatusCode(500, "Не удалось сгенерировать хеш пароля");

        // ✅ Используем хешированный пароль
        user.PasswordHash = hashedPassword;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Пароль успешно обновлён" });
    }
}