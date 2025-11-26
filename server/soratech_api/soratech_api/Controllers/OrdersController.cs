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
    /// Контроллер для управления заказами
    /// </summary>
    /// <remarks>
    /// Управление заказами: создание, получение, обновление, удаление заказов. При создании заказа автоматически обновляется количество товаров на складе и счетчик продаж.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public OrdersController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех заказов
        /// </summary>
        /// <returns>Список заказов</returns>
        /// <response code="200">Список заказов успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Order>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            return await _context.Orders.ToListAsync();
        }

        /// <summary>
        /// Получить заказ по ID
        /// </summary>
        /// <param name="id">Идентификатор заказа</param>
        /// <returns>Данные заказа</returns>
        /// <response code="200">Заказ найден</response>
        /// <response code="404">Заказ не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Order>> GetOrder(int? id)
        {
            var order = await _context.Orders.FindAsync(id);

            if (order == null)
            {
                return NotFound();
            }

            return order;
        }

        /// <summary>
        /// Обновить данные заказа
        /// </summary>
        /// <param name="id">Идентификатор заказа</param>
        /// <param name="order">Обновленные данные заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Заказ успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Заказ не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutOrder(int? id, Order order)
        {
            if (id != order.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(order).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!OrderExists(id))
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
        /// Создать новый заказ
        /// </summary>
        /// <param name="order">Данные нового заказа с товарами (OrderItems)</param>
        /// <returns>Созданный заказ</returns>
        /// <response code="201">Заказ успешно создан</response>
        /// <response code="400">Некорректные данные (заказ должен содержать товары, товар не найден, недостаточно товара на складе)</response>
        /// <remarks>
        /// При создании заказа автоматически:
        /// - Проверяется наличие товаров на складе
        /// - Уменьшается количество товаров на складе (StockQuantity)
        /// - Увеличивается счетчик продаж (SalesCount)
        /// Все операции выполняются в транзакции для обеспечения целостности данных.
        /// </remarks>
        [HttpPost]
        [ProducesResponseType(typeof(Order), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Order>> PostOrder(Order order)
        {
            // Используем транзакцию для обеспечения целостности данных
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Валидация: проверяем, что заказ содержит товары
                if (order.OrderItems == null || !order.OrderItems.Any())
                {
                    return BadRequest(new { message = "Заказ должен содержать хотя бы один товар" });
                }

                // Валидация и обновление товаров
                foreach (var orderItem in order.OrderItems)
                {
                    // Получаем товар из базы данных
                    var product = await _context.Products.FindAsync(orderItem.ProductId);
                    
                    if (product == null)
                    {
                        return BadRequest(new { 
                            message = $"Товар с ID {orderItem.ProductId} не найден" 
                        });
                    }

                    // Проверяем наличие товара на складе
                    var availableQuantity = product.StockQuantity ?? 0;
                    if (availableQuantity < orderItem.Quantity)
                    {
                        return BadRequest(new { 
                            message = $"Недостаточно товара '{product.NameProduct}' на складе. " +
                                     $"Доступно: {availableQuantity}, запрошено: {orderItem.Quantity}" 
                        });
                    }

                    // Обновляем количество товара на складе
                    product.StockQuantity = availableQuantity - orderItem.Quantity;
                    
                    // Увеличиваем счетчик продаж
                    product.SalesCount += orderItem.Quantity;

                    // Помечаем товар как измененный
                    _context.Entry(product).State = EntityState.Modified;
                }

                // Добавляем заказ в контекст
                _context.Orders.Add(order);
                
                // Устанавливаем user_id для аудита ВНУТРИ транзакции
                _context.SetCurrentUserIdFromClaims(User);
                
                // Сохраняем изменения (заказ и обновления товаров)
                await _context.SaveChangesAsync();
                
                // Фиксируем транзакцию
                await transaction.CommitAsync();

                return CreatedAtAction("GetOrder", new { id = order.Id }, order);
            }
            catch (DbUpdateException ex)
            {
                // Откатываем транзакцию в случае ошибки
                await transaction.RollbackAsync();
                return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
            }
            catch (Exception ex)
            {
                // Откатываем транзакцию в случае любой другой ошибки
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании заказа: {ex.Message}" });
            }
        }


        /// <summary>
        /// Удалить заказ
        /// </summary>
        /// <param name="id">Идентификатор заказа</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Заказ успешно удален</response>
        /// <response code="404">Заказ не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteOrder(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return NotFound();
            }

            _context.Orders.Remove(order);
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

        private bool OrderExists(int? id)
        {
            return _context.Orders.Any(e => e.Id == id);
        }
    }
}
