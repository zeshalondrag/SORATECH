using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class AuditLog
{
    public int? Id { get; set; }

    public string TableName { get; set; } = null!;

    public string Operation { get; set; } = null!;

    public string? RecordId { get; set; }

    public string? OldData { get; set; }

    public string? NewData { get; set; }

    public DateTime? ChangedAt { get; set; }

    public int? UserId { get; set; }

    public virtual User? User { get; set; }
}