using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления характеристиками товаров
    /// </summary>
    /// <remarks>
    /// Управление характеристиками: получение, создание, обновление, удаление характеристик товаров
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class CharacteristicsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public CharacteristicsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех характеристик
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленные характеристики в результат (по умолчанию: false)</param>
        /// <returns>Список характеристик</returns>
        /// <response code="200">Список характеристик успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Characteristic>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Characteristic>>> GetCharacteristics([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Characteristics.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(c => !c.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить характеристику по ID
        /// </summary>
        /// <param name="id">Идентификатор характеристики</param>
        /// <param name="includeDeleted">Включать ли удаленные характеристики (по умолчанию: false)</param>
        /// <returns>Данные характеристики</returns>
        /// <response code="200">Характеристика найдена</response>
        /// <response code="404">Характеристика не найдена</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Characteristic), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<Characteristic>> GetCharacteristic(int? id, [FromQuery] bool includeDeleted = false)
        {
            var characteristic = await _context.Characteristics.FindAsync(id);

            if (characteristic == null)
            {
                return NotFound();
            }

            if (!includeDeleted && characteristic.Deleted)
            {
                return NotFound();
            }

            return characteristic;
        }

        /// <summary>
        /// Обновить данные характеристики
        /// </summary>
        /// <param name="id">Идентификатор характеристики</param>
        /// <param name="characteristic">Обновленные данные характеристики</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика успешно обновлена</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Характеристика не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> PutCharacteristic(int? id, Characteristic characteristic)
        {
            if (id != characteristic.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(characteristic).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!CharacteristicExists(id))
                {
                    return NotFound(new { message = "Характеристика не найдена" });
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
        /// Создать новую характеристику
        /// </summary>
        /// <param name="characteristic">Данные новой характеристики</param>
        /// <returns>Созданная характеристика</returns>
        /// <response code="201">Характеристика успешно создана</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost]
        [ProducesResponseType(typeof(Characteristic), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Characteristic>> PostCharacteristic(Characteristic characteristic)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.Characteristics.Add(characteristic);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetCharacteristic", new { id = characteristic.Id }, characteristic);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить характеристику
        /// </summary>
        /// <param name="id">Идентификатор характеристики</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика успешно удалена</response>
        /// <response code="404">Характеристика не найдена</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> DeleteCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var characteristic = await _context.Characteristics.FindAsync(id);
                if (characteristic == null || characteristic.Deleted)
                {
                    return NotFound(new { message = "Характеристика не найдена" });
                }

                // Логическое удаление
                characteristic.Deleted = true;
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
        /// Физически удалить характеристику
        /// </summary>
        /// <param name="id">Идентификатор характеристики</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика успешно удалена</response>
        /// <response code="404">Характеристика не найдена</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpDelete("{id}/hard")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> HardDeleteCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var characteristic = await _context.Characteristics.FindAsync(id);
                if (characteristic == null)
                {
                    return NotFound(new { message = "Характеристика не найдена" });
                }

                // Физическое удаление
                _context.Characteristics.Remove(characteristic);
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
        /// Восстановить удаленную характеристику
        /// </summary>
        /// <param name="id">Идентификатор характеристики</param>
        /// <returns>Восстановленная характеристика</returns>
        /// <response code="200">Характеристика успешно восстановлена</response>
        /// <response code="400">Характеристика не была удалена или ошибка при восстановлении</response>
        /// <response code="404">Характеристика не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(Characteristic), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Characteristic>> RestoreCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var characteristic = await _context.Characteristics.FindAsync(id);
                if (characteristic == null)
                {
                    return NotFound(new { message = "Характеристика не найдена" });
                }

                if (!characteristic.Deleted)
                {
                    return BadRequest(new { message = "Характеристика не удалена" });
                }

                // Восстановление
                characteristic.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(characteristic);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        private bool CharacteristicExists(int? id)
        {
            return _context.Characteristics.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
