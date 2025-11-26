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
    /// Контроллер для управления типами доставки
    /// </summary>
    /// <remarks>
    /// Управление типами доставки: получение, создание, обновление, удаление типов доставки
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class DeliveryTypesController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public DeliveryTypesController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех типов доставки
        /// </summary>
        /// <returns>Список типов доставки</returns>
        /// <response code="200">Список типов доставки успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<DeliveryType>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<DeliveryType>>> GetDeliveryTypes()
        {
            return await _context.DeliveryTypes.ToListAsync();
        }

        /// <summary>
        /// Получить тип доставки по ID
        /// </summary>
        /// <param name="id">Идентификатор типа доставки</param>
        /// <returns>Данные типа доставки</returns>
        /// <response code="200">Тип доставки найден</response>
        /// <response code="404">Тип доставки не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(DeliveryType), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<DeliveryType>> GetDeliveryType(int? id)
        {
            var deliveryType = await _context.DeliveryTypes.FindAsync(id);
            if (deliveryType == null)
            {
                return NotFound(new { message = "Тип доставки не найден" });
            }

            return deliveryType;
        }

        /// <summary>
        /// Обновить тип доставки
        /// </summary>
        /// <param name="id">Идентификатор типа доставки</param>
        /// <param name="deliveryType">Обновленные данные типа доставки</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Тип доставки успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Тип доставки не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> PutDeliveryType(int? id, DeliveryType deliveryType)
        {
            if (id != deliveryType.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(deliveryType).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!DeliveryTypeExists(id))
                {
                    return NotFound(new { message = "Тип доставки не найден" });
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
        /// Создать новый тип доставки
        /// </summary>
        /// <param name="deliveryType">Данные нового типа доставки</param>
        /// <returns>Созданный тип доставки</returns>
        /// <response code="201">Тип доставки успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost]
        [ProducesResponseType(typeof(DeliveryType), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<DeliveryType>> PostDeliveryType(DeliveryType deliveryType)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.DeliveryTypes.Add(deliveryType);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetDeliveryType", new { id = deliveryType.Id }, deliveryType);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить тип доставки
        /// </summary>
        /// <param name="id">Идентификатор типа доставки</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Тип доставки успешно удален</response>
        /// <response code="404">Тип доставки не найден</response>
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
        public async Task<IActionResult> DeleteDeliveryType(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var deliveryType = await _context.DeliveryTypes.FindAsync(id);
                if (deliveryType == null)
                {
                    return NotFound(new { message = "Тип доставки не найден" });
                }

                _context.DeliveryTypes.Remove(deliveryType);
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

        private bool DeliveryTypeExists(int? id)
        {
            return _context.DeliveryTypes.Any(e => e.Id == id);
        }
    }
}
