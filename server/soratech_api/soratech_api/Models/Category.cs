using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Category
{
    public int? Id { get; set; }

    public string NameCategory { get; set; } = null!;

    public string Description { get; set; } = null!;

    public bool Deleted { get; set; }
}