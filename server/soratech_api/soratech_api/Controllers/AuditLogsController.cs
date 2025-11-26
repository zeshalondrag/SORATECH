using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для просмотра журнала аудита
    /// </summary>
    /// <remarks>
    /// Просмотр журнала аудита: получение списка всех записей аудита и записей по ID. Требуется роль Администратор.
    /// Журнал аудита автоматически заполняется триггерами базы данных при всех изменениях данных.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Администратор")]
    public class AuditLogsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public AuditLogsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех записей аудита
        /// </summary>
        /// <returns>Список записей аудита</returns>
        /// <response code="200">Список записей аудита успешно получен</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<AuditLog>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetAuditLogs()
        {
            return await _context.AuditLogs.ToListAsync();
        }

        /// <summary>
        /// Получить запись аудита по ID
        /// </summary>
        /// <param name="id">Идентификатор записи аудита</param>
        /// <returns>Данные записи аудита</returns>
        /// <response code="200">Запись аудита найдена</response>
        /// <response code="404">Запись аудита не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(AuditLog), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AuditLog>> GetAuditLog(int? id)
        {
            var auditLog = await _context.AuditLogs.FindAsync(id);

            if (auditLog == null)
            {
                return NotFound(new { message = "Запись аудита не найдена" });
            }

            return auditLog;
        }

        private bool AuditLogExists(int? id)
        {
            return _context.AuditLogs.Any(e => e.Id == id);
        }
    }
}
