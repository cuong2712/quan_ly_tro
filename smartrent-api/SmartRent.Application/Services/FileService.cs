using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace SmartRent.Application.Services;

// Dịch vụ quản lý và lưu trữ File / Hình ảnh an toàn cho hệ thống
public class FileService(IWebHostEnvironment env)
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> AllowedDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx"
    };

    private const long MaxImageSizeBytes = 5 * 1024 * 1024;       // 5 MB
    private const long MaxRoomImageSizeBytes = 10 * 1024 * 1024;  // 10 MB
    private const long MaxPanoramaSizeBytes = 25 * 1024 * 1024;   // 25 MB
    private const long MaxDocumentSizeBytes = 10 * 1024 * 1024;   // 10 MB

    // Upload file hình ảnh (Avatar, CCCD, Ảnh chuyển khoản)
    public async Task<string> UploadImageAsync(IFormFile file, string category)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Vui lòng chọn file hình ảnh hợp lệ");

        if (file.Length > MaxImageSizeBytes)
            throw new ArgumentException("Dung lượng hình ảnh vượt quá giới hạn cho phép (tối đa 5MB)");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            throw new ArgumentException("Định dạng hình ảnh không hợp lệ (chấp nhận: .jpg, .jpeg, .png, .webp)");

        return await SaveFileInternalAsync(file, category, ext);
    }

    // Upload ảnh 360 độ Panorama chất lượng cao (hỗ trợ tối đa 25MB)
    public async Task<string> UploadPanoramaAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Vui lòng chọn file hình ảnh 360° hợp lệ");

        if (file.Length > MaxPanoramaSizeBytes)
            throw new ArgumentException("Dung lượng ảnh 360° vượt quá giới hạn cho phép (tối đa 25MB)");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            throw new ArgumentException("Định dạng ảnh không hợp lệ (chấp nhận: .jpg, .jpeg, .png, .webp)");

        return await SaveFileInternalAsync(file, "panoramas", ext);
    }

    // Upload ảnh chụp thực tế phòng trọ (hỗ trợ tối đa 10MB)
    public async Task<string> UploadRoomImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Vui lòng chọn file hình ảnh hợp lệ");

        if (file.Length > MaxRoomImageSizeBytes)
            throw new ArgumentException("Dung lượng ảnh phòng vượt quá giới hạn cho phép (tối đa 10MB)");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            throw new ArgumentException("Định dạng hình ảnh không hợp lệ (chấp nhận: .jpg, .jpeg, .png, .webp)");

        return await SaveFileInternalAsync(file, "rooms", ext);
    }

    // Upload nhiều ảnh chụp phòng trọ cùng lúc
    public async Task<List<string>> UploadRoomImagesAsync(IList<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            throw new ArgumentException("Vui lòng chọn ít nhất một hình ảnh");

        var urls = new List<string>();
        foreach (var file in files)
        {
            if (file != null && file.Length > 0)
            {
                var url = await UploadRoomImageAsync(file);
                urls.Add(url);
            }
        }
        return urls;
    }

    // Upload file tài liệu (Hợp đồng, Chứng từ)
    public async Task<string> UploadDocumentAsync(IFormFile file, string category)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Vui lòng chọn file tài liệu hợp lệ");

        if (file.Length > MaxDocumentSizeBytes)
            throw new ArgumentException("Dung lượng tài liệu vượt quá giới hạn cho phép (tối đa 10MB)");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedDocumentExtensions.Contains(ext))
            throw new ArgumentException("Định dạng tài liệu không hợp lệ (chấp nhận: .pdf, .doc, .docx)");

        return await SaveFileInternalAsync(file, category, ext);
    }

    // Lưu file vào thư mục wwwroot/uploads/{category}
    private async Task<string> SaveFileInternalAsync(IFormFile file, string category, string extension)
    {
        var webRoot = env.WebRootPath;
        if (string.IsNullOrEmpty(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var folderPath = Path.Combine(webRoot, "uploads", category);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(folderPath, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/uploads/{category}/{uniqueFileName}";
    }
}
