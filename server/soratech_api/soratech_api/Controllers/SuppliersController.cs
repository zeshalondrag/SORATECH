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
    /// Контроллер для управления поставщиками
    /// </summary>
    /// <remarks>
    /// Управление поставщиками: получение, создание, обновление, удаление поставщиков товаров
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class SuppliersController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public SuppliersController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех поставщиков
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленных поставщиков в результат (по умолчанию: false)</param>
        /// <returns>Список поставщиков</returns>
        /// <response code="200">Список поставщиков успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Supplier>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Supplier>>> GetSuppliers([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Suppliers.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(s => !s.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить поставщика по ID
        /// </summary>
        /// <param name="id">Идентификатор поставщика</param>
        /// <param name="includeDeleted">Включать ли удаленных поставщиков (по умолчанию: false)</param>
        /// <returns>Данные поставщика</returns>
        /// <response code="200">Поставщик найден</response>
        /// <response code="404">Поставщик не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Supplier), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<Supplier>> GetSupplier(int? id, [FromQuery] bool includeDeleted = false)
        {
            var supplier = await _context.Suppliers.FindAsync(id);

            if (supplier == null)
            {
                return NotFound();
            }

            if (!includeDeleted && supplier.Deleted)
            {
                return NotFound();
            }

            return supplier;
        }

        /// <summary>
        /// Обновить данные поставщика
        /// </summary>
        /// <param name="id">Идентификатор поставщика</param>
        /// <param name="supplier">Обновленные данные поставщика</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Поставщик успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Поставщик не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> PutSupplier(int? id, Supplier supplier)
        {
            if (id != supplier.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(supplier).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!SupplierExists(id))
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
        /// Создать нового поставщика
        /// </summary>
        /// <param name="supplier">Данные нового поставщика</param>
        /// <returns>Созданный поставщик</returns>
        /// <response code="201">Поставщик успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost]
        [ProducesResponseType(typeof(Supplier), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Supplier>> PostSupplier(Supplier supplier)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.Suppliers.Add(supplier);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetSupplier", new { id = supplier.Id }, supplier);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить поставщика
        /// </summary>
        /// <param name="id">Идентификатор поставщика</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Поставщик успешно удален</response>
        /// <response code="404">Поставщик не найден</response>
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
        public async Task<IActionResult> DeleteSupplier(int? id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null || supplier.Deleted)
            {
                return NotFound();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Логическое удаление
                supplier.Deleted = true;
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
        /// Физически удалить поставщика
        /// </summary>
        /// <param name="id">Идентификатор поставщика</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Поставщик успешно удален</response>
        /// <response code="404">Поставщик не найден</response>
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
        public async Task<IActionResult> HardDeleteSupplier(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var supplier = await _context.Suppliers.FindAsync(id);
                if (supplier == null)
                {
                    return NotFound();
                }

                // Физическое удаление
            _context.Suppliers.Remove(supplier);
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
        /// Восстановить удаленного поставщика
        /// </summary>
        /// <param name="id">Идентификатор поставщика</param>
        /// <returns>Восстановленный поставщик</returns>
        /// <response code="200">Поставщик успешно восстановлен</response>
        /// <response code="400">Поставщик не был удален или ошибка при восстановлении</response>
        /// <response code="404">Поставщик не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(Supplier), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Supplier>> RestoreSupplier(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var supplier = await _context.Suppliers.FindAsync(id);
                if (supplier == null)
                {
                    return NotFound();
                }

                if (!supplier.Deleted)
                {
                    return BadRequest(new { message = "Поставщик не удален" });
                }

                // Восстановление
                supplier.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(supplier);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        private bool SupplierExists(int? id)
        {
            return _context.Suppliers.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
