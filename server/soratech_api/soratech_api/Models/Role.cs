using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Role
{
    public int? Id { get; set; }

    public string RoleName { get; set; } = null!;
}