using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class User
{
    public int? Id { get; set; }

    public int RoleId { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string Nickname { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public DateOnly RegistrationDate { get; set; }

    public bool Deleted { get; set; }

    public bool IsDarkTheme { get; set; } 

    public string Currency { get; set; } = "RUB";

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}