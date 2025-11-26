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
    /// Контроллер для управления типами оплаты
    /// </summary>
    /// <remarks>
    /// Управление типами оплаты: получение, создание, обновление, удаление типов оплаты
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentTypesController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public PaymentTypesController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех типов оплаты
        /// </summary>
        /// <returns>Список типов оплаты</returns>
        /// <response code="200">Список типов оплаты успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<PaymentType>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<PaymentType>>> GetPaymentTypes()
        {
            return await _context.PaymentTypes.ToListAsync();
        }

        /// <summary>
        /// Получить тип оплаты по ID
        /// </summary>
        /// <param name="id">Идентификатор типа оплаты</param>
        /// <returns>Данные типа оплаты</returns>
        /// <response code="200">Тип оплаты найден</response>
        /// <response code="404">Тип оплаты не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(PaymentType), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<PaymentType>> GetPaymentType(int? id)
        {
            var paymentType = await _context.PaymentTypes.FindAsync(id);
            if (paymentType == null)
            {
                return NotFound(new { message = "Тип оплаты не найден" });
            }

            return paymentType;
        }

        /// <summary>
        /// Обновить тип оплаты
        /// </summary>
        /// <param name="id">Идентификатор типа оплаты</param>
        /// <param name="paymentType">Обновленные данные типа оплаты</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Тип оплаты успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Тип оплаты не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> PutPaymentType(int? id, PaymentType paymentType)
        {
            if (id != paymentType.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(paymentType).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!PaymentTypeExists(id))
                {
                    return NotFound(new { message = "Тип оплаты не найден" });
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
        /// Создать новый тип оплаты
        /// </summary>
        /// <param name="paymentType">Данные нового типа оплаты</param>
        /// <returns>Созданный тип оплаты</returns>
        /// <response code="201">Тип оплаты успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost]
        [ProducesResponseType(typeof(PaymentType), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<PaymentType>> PostPaymentType(PaymentType paymentType)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.PaymentTypes.Add(paymentType);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetPaymentType", new { id = paymentType.Id }, paymentType);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить тип оплаты
        /// </summary>
        /// <param name="id">Идентификатор типа оплаты</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Тип оплаты успешно удален</response>
        /// <response code="404">Тип оплаты не найден</response>
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
        public async Task<IActionResult> DeletePaymentType(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var paymentType = await _context.PaymentTypes.FindAsync(id);
                if (paymentType == null)
                {
                    return NotFound(new { message = "Тип оплаты не найден" });
                }

                _context.PaymentTypes.Remove(paymentType);
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

        private bool PaymentTypeExists(int? id)
        {
            return _context.PaymentTypes.Any(e => e.Id == id);
        }
    }
}
