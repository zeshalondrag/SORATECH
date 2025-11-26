using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class StatusOrder
{
    public int? Id { get; set; }

    public string StatusName { get; set; } = null!;
}