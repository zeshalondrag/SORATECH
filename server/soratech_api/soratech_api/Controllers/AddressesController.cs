using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления адресами пользователей
    /// </summary>
    /// <remarks>
    /// Управление адресами: получение, создание, обновление, удаление адресов пользователей. Пользователи могут управлять только своими адресами.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public AddressesController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех адресов текущего пользователя
        /// </summary>
        /// <returns>Список адресов пользователя</returns>
        /// <response code="200">Список адресов успешно получен</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="400">Некорректный идентификатор пользователя</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Address>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<IEnumerable<Address>>> GetAddresses()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized("Не удалось определить пользователя.");

            if (!int.TryParse(userIdClaim, out int userId))
                return BadRequest("Некорректный идентификатор пользователя.");

            var userAddresses = await _context.Addresses
                .Where(a => a.UserId == userId)
                .ToListAsync();

            return Ok(userAddresses);
        }

        /// <summary>
        /// Получить адрес по ID
        /// </summary>
        /// <param name="id">Идентификатор адреса</param>
        /// <returns>Данные адреса</returns>
        /// <response code="200">Адрес найден</response>
        /// <response code="404">Адрес не найден</response>
        /// <response code="401">Не авторизован</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Address), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<Address>> GetAddress(int? id)
        {
            var address = await _context.Addresses.FindAsync(id);

            if (address == null)
            {
                return NotFound();
            }

            return address;
        }

        /// <summary>
        /// Обновить адрес
        /// </summary>
        /// <param name="id">Идентификатор адреса</param>
        /// <param name="address">Обновленные данные адреса</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Адрес успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Адрес не найден</response>
        /// <response code="401">Не авторизован</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PutAddress(int? id, Address address)
        {
            if (id != address.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(address).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!AddressExists(id))
                {
                    return NotFound(new { message = "Адрес не найден" });
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
        /// Создать новый адрес
        /// </summary>
        /// <param name="address">Данные нового адреса</param>
        /// <returns>Созданный адрес</returns>
        /// <response code="201">Адрес успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        [HttpPost]
        [ProducesResponseType(typeof(Address), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<Address>> PostAddress(Address address)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { message = "Не удалось определить пользователя" });

            if (!int.TryParse(userIdClaim, out int userId))
                return BadRequest(new { message = "Некорректный идентификатор пользователя" });

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                address.UserId = userId;
                _context.Addresses.Add(address);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetAddress", new { id = address.Id }, address);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить адрес
        /// </summary>
        /// <param name="id">Идентификатор адреса</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Адрес успешно удален</response>
        /// <response code="404">Адрес не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteAddress(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var address = await _context.Addresses.FindAsync(id);
                if (address == null)
                {
                    return NotFound(new { message = "Адрес не найден" });
                }

                _context.Addresses.Remove(address);
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

        private bool AddressExists(int? id)
        {
            return _context.Addresses.Any(e => e.Id == id);
        }
    }
}
