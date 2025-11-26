namespace soratech_api.Models.DTO;

public class RegisterDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string Phone { get; set; } = null!;
}