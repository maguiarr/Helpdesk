---
description: Scaffolds a new controller, service, repository, model, DTOs, and AutoMapper mapping for a given resource, following HelpDeskApi patterns. Usage: /api-endpoint <ResourceName>
allowed-tools: Bash, Read, Edit, Write
---

You are scaffolding a new API resource in the HelpDeskApi project. The argument passed to this command is: `$ARGUMENTS`

## Step 1: Parse and Validate Arguments

Extract the resource name from `$ARGUMENTS`. If it is empty or missing, stop immediately and tell the user:
> Usage: `/api-endpoint <ResourceName>` — e.g., `/api-endpoint Comment`

Normalize the resource name:
- `Resource` = PascalCase (e.g., `Comment`)
- `resource` = camelCase (e.g., `comment`)
- `resources` = lowercase plural (e.g., `comments`)
- Base path = `/mnt/c/marcelo/AI/Helpdesk/backend/src/HelpDeskApi`

## Step 2: Print Summary and Confirm

Print the following summary, then proceed (do not wait for confirmation unless $ARGUMENTS was ambiguous):

```
Scaffolding resource: {Resource}

Files to CREATE:
  Models/{Resource}.cs
  Data/Configurations/{Resource}Configuration.cs
  DTOs/Create{Resource}Request.cs
  DTOs/{Resource}Response.cs
  Repositories/I{Resource}Repository.cs
  Repositories/{Resource}Repository.cs
  Services/I{Resource}Service.cs
  Services/{Resource}Service.cs
  Controllers/{Resource}sController.cs

Files to EDIT:
  Data/AppDbContext.cs       — add DbSet<{Resource}>
  Mapping/MappingProfile.cs  — add Create/Response mappings
  Program.cs                 — register scoped DI

Migration:
  dotnet ef migrations add Add{Resource}
```

## Step 3: Create All Files

### `Models/{Resource}.cs`

```csharp
namespace HelpDeskApi.Models;

// TODO: Customize fields to match your domain
public class {Resource}
{
    public Guid {Resource}Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

### `Data/Configurations/{Resource}Configuration.cs`

```csharp
using HelpDeskApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HelpDeskApi.Data.Configurations;

public class {Resource}Configuration : IEntityTypeConfiguration<{Resource}>
{
    public void Configure(EntityTypeBuilder<{Resource}> builder)
    {
        builder.HasKey(t => t.{Resource}Id);
        builder.Property(t => t.{Resource}Id).HasDefaultValueSql("gen_random_uuid()");

        // TODO: Adjust field constraints to match your domain
        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Description).IsRequired().HasMaxLength(4000);

        builder.Property(t => t.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(t => t.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();
    }
}
```

### `DTOs/Create{Resource}Request.cs`

```csharp
namespace HelpDeskApi.DTOs;

// TODO: Add fields matching your model
public class Create{Resource}Request
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
```

### `DTOs/{Resource}Response.cs`

```csharp
namespace HelpDeskApi.DTOs;

// TODO: Add fields matching your model
public class {Resource}Response
{
    public Guid {Resource}Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

### `Repositories/I{Resource}Repository.cs`

```csharp
using HelpDeskApi.Models;

namespace HelpDeskApi.Repositories;

public interface I{Resource}Repository
{
    Task<IEnumerable<{Resource}>> GetAllAsync();
    Task<{Resource}?> GetByIdAsync(Guid id);
    Task<{Resource}> CreateAsync({Resource} entity);
    Task<{Resource}> UpdateAsync({Resource} entity);
    Task DeleteAsync({Resource} entity);
}
```

### `Repositories/{Resource}Repository.cs`

```csharp
using HelpDeskApi.Data;
using HelpDeskApi.Models;
using Microsoft.EntityFrameworkCore;

namespace HelpDeskApi.Repositories;

public class {Resource}Repository : I{Resource}Repository
{
    private readonly AppDbContext _context;

    public {Resource}Repository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<{Resource}>> GetAllAsync()
    {
        return await _context.{Resource}s
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<{Resource}?> GetByIdAsync(Guid id)
    {
        return await _context.{Resource}s.FindAsync(id);
    }

    public async Task<{Resource}> CreateAsync({Resource} entity)
    {
        _context.{Resource}s.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<{Resource}> UpdateAsync({Resource} entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        _context.{Resource}s.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync({Resource} entity)
    {
        _context.{Resource}s.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
```

### `Services/I{Resource}Service.cs`

```csharp
using HelpDeskApi.DTOs;

namespace HelpDeskApi.Services;

public interface I{Resource}Service
{
    Task<IEnumerable<{Resource}Response>> GetAllAsync();
    Task<{Resource}Response?> GetByIdAsync(Guid id);
    Task<{Resource}Response> CreateAsync(Create{Resource}Request request);
    Task<{Resource}Response> UpdateAsync(Guid id, Create{Resource}Request request);
    Task DeleteAsync(Guid id);
}
```

### `Services/{Resource}Service.cs`

```csharp
using AutoMapper;
using HelpDeskApi.DTOs;
using HelpDeskApi.Models;
using HelpDeskApi.Repositories;

namespace HelpDeskApi.Services;

public class {Resource}Service : I{Resource}Service
{
    private readonly I{Resource}Repository _repository;
    private readonly IMapper _mapper;

    public {Resource}Service(I{Resource}Repository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<{Resource}Response>> GetAllAsync()
    {
        var entities = await _repository.GetAllAsync();
        return _mapper.Map<IEnumerable<{Resource}Response>>(entities);
    }

    public async Task<{Resource}Response?> GetByIdAsync(Guid id)
    {
        var entity = await _repository.GetByIdAsync(id);
        return entity is null ? null : _mapper.Map<{Resource}Response>(entity);
    }

    public async Task<{Resource}Response> CreateAsync(Create{Resource}Request request)
    {
        var entity = _mapper.Map<{Resource}>(request);
        var created = await _repository.CreateAsync(entity);
        return _mapper.Map<{Resource}Response>(created);
    }

    public async Task<{Resource}Response> UpdateAsync(Guid id, Create{Resource}Request request)
    {
        var entity = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"{Resource} {id} not found");

        _mapper.Map(request, entity);
        var updated = await _repository.UpdateAsync(entity);
        return _mapper.Map<{Resource}Response>(updated);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"{Resource} {id} not found");

        await _repository.DeleteAsync(entity);
    }
}
```

### `Controllers/{Resource}sController.cs`

```csharp
using HelpDeskApi.DTOs;
using HelpDeskApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class {Resource}sController : ControllerBase
{
    private readonly I{Resource}Service _{resource}Service;

    public {Resource}sController(I{Resource}Service {resource}Service)
    {
        _{resource}Service = {resource}Service;
    }

    [HttpGet]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<IEnumerable<{Resource}Response>>> GetAll()
    {
        var items = await _{resource}Service.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<{Resource}Response>> GetById(Guid id)
    {
        var item = await _{resource}Service.GetByIdAsync(id);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<{Resource}Response>> Create([FromBody] Create{Resource}Request request)
    {
        var item = await _{resource}Service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = item.{Resource}Id }, item);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<{Resource}Response>> Update(Guid id, [FromBody] Create{Resource}Request request)
    {
        var item = await _{resource}Service.UpdateAsync(id, request);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _{resource}Service.DeleteAsync(id);
        return NoContent();
    }
}
```

## Step 4: Edit `Data/AppDbContext.cs`

Read the file first, then add the new DbSet after the existing `Tickets` line:

```csharp
    public DbSet<{Resource}> {Resource}s => Set<{Resource}>();
```

Also add the using if needed: `using HelpDeskApi.Models;` (already present).

## Step 5: Edit `Mapping/MappingProfile.cs`

Read the file first, then add inside the `MappingProfile()` constructor, after the existing `CreateMap` lines:

```csharp
        CreateMap<{Resource}, {Resource}Response>();
        CreateMap<Create{Resource}Request, {Resource}>();
```

## Step 6: Edit `Program.cs`

Read the file first, then add after the existing `AddScoped` lines (after `AddScoped<ITicketService, TicketService>()`):

```csharp
builder.Services.AddScoped<I{Resource}Repository, {Resource}Repository>();
builder.Services.AddScoped<I{Resource}Service, {Resource}Service>();
```

## Step 7: Run EF Migration

```bash
cd /mnt/c/marcelo/AI/Helpdesk/backend && dotnet ef migrations add Add{Resource} --project src/HelpDeskApi
```

## Step 8: Print Completion Summary

Print a summary like:

```
✓ Scaffolding complete for: {Resource}

Created:
  backend/src/HelpDeskApi/Models/{Resource}.cs
  backend/src/HelpDeskApi/Data/Configurations/{Resource}Configuration.cs
  backend/src/HelpDeskApi/DTOs/Create{Resource}Request.cs
  backend/src/HelpDeskApi/DTOs/{Resource}Response.cs
  backend/src/HelpDeskApi/Repositories/I{Resource}Repository.cs
  backend/src/HelpDeskApi/Repositories/{Resource}Repository.cs
  backend/src/HelpDeskApi/Services/I{Resource}Service.cs
  backend/src/HelpDeskApi/Services/{Resource}Service.cs
  backend/src/HelpDeskApi/Controllers/{Resource}sController.cs

Modified:
  backend/src/HelpDeskApi/Data/AppDbContext.cs
  backend/src/HelpDeskApi/Mapping/MappingProfile.cs
  backend/src/HelpDeskApi/Program.cs

Migration added: Add{Resource}

Next steps:
  1. Customize the placeholder fields in Models/{Resource}.cs and the matching DTOs/Configuration
  2. Add FluentValidation: create Validators/Create{Resource}RequestValidator.cs
  3. Run `make up` or `dotnet run` to test — check Swagger at http://localhost:8080/swagger
```
