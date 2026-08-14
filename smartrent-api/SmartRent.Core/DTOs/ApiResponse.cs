using System.Text.Json.Serialization;

namespace SmartRent.Core.DTOs;

// Cấu trúc phản hồi API chuẩn hóa toàn hệ thống (Envelope Response Pattern)
// Luôn trả về HTTP Status 200 OK cho Client, mã trạng thái nghiệp vụ thực tế nằm trong trường "code"
public class ApiResponse<T>
{
    // Mã HTTP status thực sự đại diện cho kết quả (200, 201, 400, 401, 403, 404, 500...)
    [JsonPropertyName("code")]
    public int Code { get; set; } = 200;

    // Trạng thái thành công hay thất bại của nghiệp vụ
    [JsonPropertyName("success")]
    public bool IsSuccess { get; set; } = true;

    // Thông báo mô tả kết quả bằng tiếng Việt thân thiện với người dùng
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    // Dữ liệu payload trả về (null nếu là lỗi hoặc không có dữ liệu)
    [JsonPropertyName("data")]
    public T? Data { get; set; }

    public ApiResponse() { }

    public ApiResponse(int code, bool success, string message, T? data = default)
    {
        Code = code;
        IsSuccess = success;
        Message = message;
        Data = data;
    }

    // Tạo phản hồi thành công kèm dữ liệu (mặc định code = 200)
    public static ApiResponse<T> Success(T data, string message = "Thao tác thành công", int code = 200) =>
        new(code, true, message, data);

    // Tạo phản hồi thất bại / lỗi (mặc định code = 400)
    public static ApiResponse<T> Fail(string message, int code = 400, T? data = default) =>
        new(code, false, message, data);
}

// Lớp tiện ích mở rộng cho ApiResponse không kèm kiểu dữ liệu generic cụ thể hoặc trả về null
public class ApiResponse : ApiResponse<object?>
{
    public ApiResponse() { }

    public ApiResponse(int code, bool success, string message, object? data = null)
        : base(code, success, message, data) { }

    // Phản hồi thành công không kèm payload data
    public static ApiResponse Ok(string message = "Thao tác thành công", int code = 200) =>
        new(code, true, message, null);

    // Phản hồi thành công có kèm payload generic
    public static ApiResponse<T> Ok<T>(T data, string message = "Thao tác thành công", int code = 200) =>
        ApiResponse<T>.Success(data, message, code);

    // Phản hồi lỗi thất bại không kèm data
    public static ApiResponse Error(string message, int code = 400) =>
        new(code, false, message, null);

    // Phản hồi lỗi thất bại (tương đương Error)
    public new static ApiResponse Fail(string message, int code = 400, object? data = null) =>
        new(code, false, message, data);

    // Phản hồi lỗi 404 Không tìm thấy dữ liệu
    public static ApiResponse NotFound(string message = "Không tìm thấy dữ liệu yêu cầu") =>
        new(404, false, message, null);

    // Phản hồi lỗi 401 Chưa xác thực
    public static ApiResponse Unauthorized(string message = "Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập") =>
        new(401, false, message, null);

    // Phản hồi lỗi 403 Không có quyền truy cập
    public static ApiResponse Forbidden(string message = "Bạn không có quyền thực hiện thao tác này") =>
        new(403, false, message, null);
}


