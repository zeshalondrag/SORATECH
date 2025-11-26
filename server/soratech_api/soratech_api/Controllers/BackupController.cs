using DotNetEnv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using System.Diagnostics;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления резервными копиями базы данных
    /// </summary>
    /// <remarks>
    /// Управление резервными копиями: создание SQL и JSON резервных копий базы данных. Требуется роль Администратор.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Администратор")]
    public class BackupController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public BackupController(SoraTechDbContext context)
        {
            _context = context;
            Env.Load();
        }

        /// <summary>
        /// Создать резервную копию базы данных
        /// </summary>
        /// <returns>Информация о созданных файлах резервной копии</returns>
        /// <response code="200">Резервная копия успешно создана</response>
        /// <response code="400">Ошибка при создании SQL-бэкапа</response>
        /// <response code="500">Внутренняя ошибка сервера</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        /// <remarks>
        /// Создает два файла резервной копии:
        /// - SQL файл (backup_YYYYMMDD_HHmmss.sql) - полная SQL резервная копия через pg_dump
        /// - JSON файл (backup_YYYYMMDD_HHmmss.json) - данные всех таблиц в формате JSON
        /// </remarks>
        [HttpPost("create")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateBackup()
        {
            try
            {
                var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
                if (!Directory.Exists(backupDir))
                    Directory.CreateDirectory(backupDir);

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var sqlPath = Path.Combine(backupDir, $"backup_{timestamp}.sql");
                var jsonPath = Path.Combine(backupDir, $"backup_{timestamp}.json");

                var host = Env.GetString("DB_HOST");
                var port = Env.GetString("DB_PORT");
                var dbName = Env.GetString("DB_NAME");
                var user = Env.GetString("DB_USER");
                var password = Env.GetString("DB_PASSWORD");

                // 🔹 Абсолютный путь к pg_dump.exe
                var pgDumpPath = @"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe";

                // 🔹 Аргументы без кавычек вокруг пути
                var args = $"-h {host} -p {port} -U {user} -d {dbName} -F p -f \"{sqlPath}\"";

                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = pgDumpPath,
                        Arguments = args,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        Environment =
                        {
                            ["PGPASSWORD"] = password
                        }
                    }
                };

                process.Start();
                string error = await process.StandardError.ReadToEndAsync();
                string output = await process.StandardOutput.ReadToEndAsync();
                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    return BadRequest(new { message = $"Ошибка при SQL-бэкапе: {error}" });
                }

                // ✅ JSON-бэкап
                var data = new
                {
                    Roles = await _context.Roles.ToListAsync(),
                    Users = await _context.Users.ToListAsync(),
                    Addresses = await _context.Addresses.ToListAsync(),
                    DeliveryTypes = await _context.DeliveryTypes.ToListAsync(),
                    PaymentTypes = await _context.PaymentTypes.ToListAsync(),
                    Categories = await _context.Categories.ToListAsync(),
                    Suppliers = await _context.Suppliers.ToListAsync(),
                    Products = await _context.Products.ToListAsync(),
                    Characteristic = await _context.Characteristics.ToListAsync(),
                    ProductCharacteristic = await _context.ProductCharacteristics.ToListAsync(),
                    StatusOrders = await _context.StatusOrders.ToListAsync(),
                    Orders = await _context.Orders.ToListAsync(),
                    OrderItems = await _context.OrderItems.ToListAsync(),
                    Reviews = await _context.Reviews.ToListAsync(),
                    Cart = await _context.Carts.ToListAsync(),
                    Favorites = await _context.Favorites.ToListAsync(),
                    AuditLog = await _context.AuditLogs.ToListAsync()
                };


                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve, 
                    MaxDepth = 128 
                };

                await System.IO.File.WriteAllTextAsync(jsonPath, JsonSerializer.Serialize(data, options));

                return Ok(new
                {
                    message = "✅ Бэкап успешно создан",
                    sqlFile = sqlPath,
                    jsonFile = jsonPath
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Ошибка при создании резервной копии: {ex.Message}" });
            }
        }
    }
}