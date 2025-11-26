using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Models.DTO;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления пользователями системы
    /// </summary>
    /// <remarks>
    /// Управление пользователями: получение, создание, обновление, удаление пользователей, управление настройками (тема, валюта)
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public UsersController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех пользователей
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленных пользователей в результат (по умолчанию: false)</param>
        /// <returns>Список пользователей</returns>
        /// <response code="200">Список пользователей успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<User>), StatusCodes.Status200OK)]
        //[Authorize(Roles = "Администратор")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Users.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(u => !u.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить пользователя по ID
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <param name="includeDeleted">Включать ли удаленных пользователей (по умолчанию: false)</param>
        /// <returns>Данные пользователя</returns>
        /// <response code="200">Пользователь найден</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(User), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<User>> GetUser(int? id, [FromQuery] bool includeDeleted = false)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            if (!includeDeleted && user.Deleted)
            {
                return NotFound();
            }

            return user;
        }

        /// <summary>
        /// Изменить роль пользователя
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <param name="roleDto">DTO с новой ролью пользователя</param>
        /// <returns>Результат операции</returns>
        /// <response code="200">Роль пользователя успешно обновлена</response>
        /// <response code="400">Некорректные данные (роль не найдена)</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPut("{id}/role")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> UpdateUserRole(int? id, [FromBody] UpdateUserRoleDto roleDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null || user.Deleted)
                {
                    return NotFound(new { message = "Пользователь не найден" });
                }

                // Проверяем, что роль существует
                var roleExists = await _context.Roles.AnyAsync(r => r.Id == roleDto.RoleId);
                if (!roleExists)
                {
                    return BadRequest(new { message = "Указанная роль не найдена" });
                }

                // Обновляем только роль
                user.RoleId = roleDto.RoleId;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { 
                    message = "Роль пользователя успешно обновлена",
                    userId = user.Id,
                    newRoleId = user.RoleId
                });
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при обновлении роли: {ex.Message}" });
            }
        }

        /// <summary>
        /// Обновить данные пользователя
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <param name="user">Обновленные данные пользователя</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Пользователь успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        /// <remarks>
        /// Обновляет только разрешенные поля: FirstName, Nickname, Phone, IsDarkTheme, Deleted.
        /// Роль, пароль, email и дата регистрации защищены от изменения через этот метод.
        /// </remarks>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> PutUser(int? id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Получаем текущего пользователя из БД
                var existingUser = await _context.Users.FindAsync(id);
                if (existingUser == null || existingUser.Deleted)
                {
                    return NotFound();
                }

                // Сохраняем роль и важные поля, чтобы их нельзя было изменить через этот метод
                var currentRoleId = existingUser.RoleId;
                var currentPasswordHash = existingUser.PasswordHash;
                var currentEmail = existingUser.Email;
                var currentRegistrationDate = existingUser.RegistrationDate;

                // Обновляем только разрешенные поля
                existingUser.FirstName = user.FirstName;
                existingUser.Nickname = user.Nickname;
                existingUser.Phone = user.Phone;
                existingUser.IsDarkTheme = user.IsDarkTheme;
                existingUser.Deleted = user.Deleted;

                // Восстанавливаем защищенные поля
                existingUser.RoleId = currentRoleId;
                existingUser.PasswordHash = currentPasswordHash;
                existingUser.Email = currentEmail;
                existingUser.RegistrationDate = currentRegistrationDate;

                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при обновлении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Создать нового пользователя
        /// </summary>
        /// <param name="user">Данные нового пользователя</param>
        /// <returns>Созданный пользователь</returns>
        /// <response code="201">Пользователь успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost]
        [ProducesResponseType(typeof(User), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<User>> PostUser(User user)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.Users.Add(user);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetUser", new { id = user.Id }, user);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить пользователя
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Пользователь успешно удален</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        /// <remarks>
        /// Выполняет логическое удаление (soft delete) - устанавливает флаг Deleted = true.
        /// Пользователь остается в базе данных, но скрыт из обычных запросов.
        /// </remarks>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> DeleteUser(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null || user.Deleted)
                {
                    return NotFound();
                }

                // Логическое удаление
                user.Deleted = true;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при удалении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Физически удалить пользователя
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Пользователь успешно удален</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        /// <remarks>
        /// Выполняет физическое удаление (hard delete) - полностью удаляет запись из базы данных.
        /// ВНИМАНИЕ: Операция необратима!
        /// </remarks>
        [HttpDelete("{id}/hard")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> HardDeleteUser(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

                // Физическое удаление
            _context.Users.Remove(user);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при удалении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Восстановить удаленного пользователя
        /// </summary>
        /// <param name="id">Идентификатор пользователя</param>
        /// <returns>Восстановленный пользователь</returns>
        /// <response code="200">Пользователь успешно восстановлен</response>
        /// <response code="400">Пользователь не был удален или ошибка при восстановлении</response>
        /// <response code="404">Пользователь не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        /// <remarks>
        /// Восстанавливает логически удаленного пользователя, устанавливая флаг Deleted = false.
        /// </remarks>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(User), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<User>> RestoreUser(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound();
                }

                if (!user.Deleted)
                {
                    return BadRequest(new { message = "Пользователь не удален" });
                }

                // Восстановление
                user.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(user);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Изменить тему интерфейса пользователя
        /// </summary>
        /// <param name="isDarkTheme">true - темная тема, false - светлая тема</param>
        /// <returns>Результат операции</returns>
        /// <response code="200">Тема успешно изменена</response>
        /// <response code="400">Ошибка при изменении темы</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="404">Пользователь не найден</response>
        [HttpPut("theme")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize]
        public async Task<IActionResult> UpdateTheme([FromBody] bool isDarkTheme)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Не удалось определить пользователя" });
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null || user.Deleted)
                {
                    return NotFound();
                }

                user.IsDarkTheme = isDarkTheme;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { 
                    userId = user.Id, 
                    isDarkTheme = user.IsDarkTheme,
                    message = $"Тема изменена на {(isDarkTheme ? "темную" : "светлую")}"
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при изменении темы: {ex.Message}" });
            }
        }

        /// <summary>
        /// Получить текущую тему интерфейса пользователя
        /// </summary>
        /// <returns>Текущая тема (true - темная, false - светлая)</returns>
        /// <response code="200">Тема успешно получена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="404">Пользователь не найден</response>
        [HttpGet("theme")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize]
        public async Task<ActionResult> GetTheme()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Не удалось определить пользователя" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.Deleted)
            {
                return NotFound();
            }

            return Ok(new { isDarkTheme = user.IsDarkTheme });
        }

        /// <summary>
        /// Изменить валюту пользователя
        /// </summary>
        /// <param name="currency">Валюта: "RUB" или "USD"</param>
        /// <returns>Результат операции</returns>
        /// <response code="200">Валюта успешно изменена</response>
        /// <response code="400">Некорректная валюта или ошибка при изменении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="404">Пользователь не найден</response>
        [HttpPut("currency")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize]
        public async Task<IActionResult> UpdateCurrency([FromBody] string currency)
        {
            // Валидация валюты
            if (string.IsNullOrEmpty(currency) || (currency != "RUB" && currency != "USD"))
            {
                return BadRequest(new { message = "Валюта должна быть 'RUB' или 'USD'" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Не удалось определить пользователя" });
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null || user.Deleted)
                {
                    return NotFound();
                }

                user.Currency = currency;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { 
                    userId = user.Id, 
                    currency = user.Currency,
                    message = $"Валюта изменена на {currency}"
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при изменении валюты: {ex.Message}" });
            }
        }

        /// <summary>
        /// Получить текущую валюту пользователя
        /// </summary>
        /// <returns>Текущая валюта (RUB или USD)</returns>
        /// <response code="200">Валюта успешно получена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="404">Пользователь не найден</response>
        [HttpGet("currency")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize]
        public async Task<ActionResult> GetCurrency()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Не удалось определить пользователя" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.Deleted)
            {
                return NotFound();
            }

            return Ok(new { currency = user.Currency });
        }

        private bool UserExists(int? id)
        {
            return _context.Users.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
