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
    /// Контроллер для управления элементами заказов
    /// </summary>
    /// <remarks>
    /// Управление элементами заказов: получение, создание, обновление, удаление элементов заказов
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class OrderItemsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public OrderItemsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех элементов заказов
        /// </summary>
        /// <returns>Список элементов заказов</returns>
        /// <response code="200">Список элементов заказов успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<OrderItem>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<OrderItem>>> GetOrderItems()
        {
            return await _context.OrderItems.ToListAsync();
        }

        /// <summary>
        /// Получить элемент заказа по ID
        /// </summary>
        /// <param name="id">Идентификатор элемента заказа</param>
        /// <returns>Данные элемента заказа</returns>
        /// <response code="200">Элемент заказа найден</response>
        /// <response code="404">Элемент заказа не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(OrderItem), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<OrderItem>> GetOrderItem(int? id)
        {
            var orderItem = await _context.OrderItems.FindAsync(id);

            if (orderItem == null)
            {
                return NotFound(new { message = "Элемент заказа не найден" });
            }

            return orderItem;
        }

        /// <summary>
        /// Обновить элемент заказа
        /// </summary>
        /// <param name="id">Идентификатор элемента заказа</param>
        /// <param name="orderItem">Обновленные данные элемента заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Элемент заказа успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Элемент заказа не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutOrderItem(int? id, OrderItem orderItem)
        {
            if (id != orderItem.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(orderItem).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!OrderItemExists(id))
                {
                    return NotFound(new { message = "Элемент заказа не найден" });
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
        /// Создать новый элемент заказа
        /// </summary>
        /// <param name="orderItem">Данные нового элемента заказа</param>
        /// <returns>Созданный элемент заказа</returns>
        /// <response code="201">Элемент заказа успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        [HttpPost]
        [ProducesResponseType(typeof(OrderItem), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<OrderItem>> PostOrderItem(OrderItem orderItem)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.OrderItems.Add(orderItem);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetOrderItem", new { id = orderItem.Id }, orderItem);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить элемент заказа
        /// </summary>
        /// <param name="id">Идентификатор элемента заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Элемент заказа успешно удален</response>
        /// <response code="404">Элемент заказа не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteOrderItem(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            var orderItem = await _context.OrderItems.FindAsync(id);
            if (orderItem == null)
            {
                return NotFound(new { message = "Элемент заказа не найден" });
            }

            _context.OrderItems.Remove(orderItem);
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

        private bool OrderItemExists(int? id)
        {
            return _context.OrderItems.Any(e => e.Id == id);
        }
    }
}
