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
    /// Контроллер для управления статусами заказов
    /// </summary>
    /// <remarks>
    /// Управление статусами заказов: получение, создание, обновление, удаление статусов заказов
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class StatusOrdersController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public StatusOrdersController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех статусов заказов
        /// </summary>
        /// <returns>Список статусов заказов</returns>
        /// <response code="200">Список статусов заказов успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<StatusOrder>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<StatusOrder>>> GetStatusOrders()
        {
            return await _context.StatusOrders.ToListAsync();
        }

        /// <summary>
        /// Получить статус заказа по ID
        /// </summary>
        /// <param name="id">Идентификатор статуса заказа</param>
        /// <returns>Данные статуса заказа</returns>
        /// <response code="200">Статус заказа найден</response>
        /// <response code="404">Статус заказа не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(StatusOrder), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<StatusOrder>> GetStatusOrder(int? id)
        {
            var statusOrder = await _context.StatusOrders.FindAsync(id);
            if (statusOrder == null)
            {
                return NotFound(new { message = "Статус заказа не найден" });
            }

            return statusOrder;
        }

        /// <summary>
        /// Обновить статус заказа
        /// </summary>
        /// <param name="id">Идентификатор статуса заказа</param>
        /// <param name="statusOrder">Обновленные данные статуса заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Статус заказа успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Статус заказа не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> PutStatusOrder(int? id, StatusOrder statusOrder)
        {
            if (id != statusOrder.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(statusOrder).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!StatusOrderExists(id))
                {
                    return NotFound(new { message = "Статус заказа не найден" });
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
        /// Создать новый статус заказа
        /// </summary>
        /// <param name="statusOrder">Данные нового статуса заказа</param>
        /// <returns>Созданный статус заказа</returns>
        /// <response code="201">Статус заказа успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost]
        [ProducesResponseType(typeof(StatusOrder), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<StatusOrder>> PostStatusOrder(StatusOrder statusOrder)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.StatusOrders.Add(statusOrder);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetStatusOrder", new { id = statusOrder.Id }, statusOrder);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить статус заказа
        /// </summary>
        /// <param name="id">Идентификатор статуса заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Статус заказа успешно удален</response>
        /// <response code="404">Статус заказа не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> DeleteStatusOrder(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var statusOrder = await _context.StatusOrders.FindAsync(id);
                if (statusOrder == null)
                {
                    return NotFound(new { message = "Статус заказа не найден" });
                }

                _context.StatusOrders.Remove(statusOrder);
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

        private bool StatusOrderExists(int? id)
        {
            return _context.StatusOrders.Any(e => e.Id == id);
        }
    }
}
