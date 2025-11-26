using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления корзиной покупок
    /// </summary>
    /// <remarks>
    /// Управление корзиной: получение, создание, обновление, удаление товаров в корзине пользователя
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class CartsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public CartsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех товаров в корзине
        /// </summary>
        /// <returns>Список товаров в корзине</returns>
        /// <response code="200">Список товаров в корзине успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Cart>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Cart>>> GetCarts()
        {
            return await _context.Carts.ToListAsync();
        }

        /// <summary>
        /// Получить товар в корзине по ID
        /// </summary>
        /// <param name="id">Идентификатор записи в корзине</param>
        /// <returns>Данные товара в корзине</returns>
        /// <response code="200">Товар в корзине найден</response>
        /// <response code="404">Товар в корзине не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Cart), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Cart>> GetCart(int? id)
        {
            var cart = await _context.Carts.FindAsync(id);

            if (cart == null)
            {
                return NotFound();
            }

            return cart;
        }

        /// <summary>
        /// Обновить товар в корзине
        /// </summary>
        /// <param name="id">Идентификатор записи в корзине</param>
        /// <param name="cart">Обновленные данные товара в корзине</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар в корзине успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Товар в корзине не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutCart(int? id, Cart cart)
        {
            if (id != cart.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(cart).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!CartExists(id))
                {
                    return NotFound(new { message = "Товар в корзине не найден" });
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
        /// Добавить товар в корзину
        /// </summary>
        /// <param name="cart">Данные товара для добавления в корзину</param>
        /// <returns>Созданная запись в корзине</returns>
        /// <response code="201">Товар успешно добавлен в корзину</response>
        /// <response code="400">Некорректные данные</response>
        [HttpPost]
        [ProducesResponseType(typeof(Cart), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Cart>> PostCart(Cart cart)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.Carts.Add(cart);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetCart", new { id = cart.Id }, cart);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить товар из корзины
        /// </summary>
        /// <param name="id">Идентификатор записи в корзине</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар успешно удален из корзины</response>
        /// <response code="404">Товар в корзине не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteCart(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var cart = await _context.Carts.FindAsync(id);
                if (cart == null)
                {
                    return NotFound(new { message = "Товар в корзине не найден" });
                }

                _context.Carts.Remove(cart);
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

        private bool CartExists(int? id)
        {
            return _context.Carts.Any(e => e.Id == id);
        }
    }
}
