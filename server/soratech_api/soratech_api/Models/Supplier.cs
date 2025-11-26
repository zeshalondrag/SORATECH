using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Supplier
{
    public int? Id { get; set; }

    public string NameSupplier { get; set; } = null!;

    public string ContactEmail { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public bool Deleted { get; set; }
}