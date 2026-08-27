using System.Text.RegularExpressions;

namespace SmartRent.Application.Common.Validators;

public static class DataValidator
{
    private static readonly Regex PhoneRegex = new(@"^(0|\+84|84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$", RegexOptions.Compiled);
    private static readonly Regex CccdRegex = new(@"^(\d{12}|\d{9})$", RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", RegexOptions.Compiled);
    private static readonly Regex NameRegex = new(@"^[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆĐÙÚỦŨỤƯỪỨỬỮỰÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÌÍỈĨỊỲÝỶỸỴ\s'-]{2,100}$", RegexOptions.Compiled);

    public static void ValidateFullName(string? name, string fieldName = "Họ và tên")
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException($"{fieldName} không được để trống.");

        var clean = name.Trim();
        if (clean.Length < 2 || clean.Length > 100)
            throw new ArgumentException($"{fieldName} phải từ 2 đến 100 ký tự.");

        if (!NameRegex.IsMatch(clean))
            throw new ArgumentException($"{fieldName} không hợp lệ (chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt).");
    }

    public static void ValidatePhone(string? phone, string fieldName = "Số điện thoại")
    {
        if (string.IsNullOrWhiteSpace(phone))
            throw new ArgumentException($"{fieldName} không được để trống.");

        var clean = phone.Trim().Replace(" ", "").Replace(".", "").Replace("-", "");
        if (!PhoneRegex.IsMatch(clean))
            throw new ArgumentException($"{fieldName} không hợp lệ (phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).");
    }

    public static void ValidateCccd(string? cccd, bool required = false, string fieldName = "Số CCCD/CMND")
    {
        if (string.IsNullOrWhiteSpace(cccd))
        {
            if (required)
                throw new ArgumentException($"{fieldName} không được để trống.");
            return;
        }

        var clean = cccd.Trim().Replace(" ", "");
        if (!CccdRegex.IsMatch(clean))
            throw new ArgumentException($"{fieldName} không hợp lệ (phải gồm đúng 12 chữ số cho CCCD hoặc 9 chữ số cho CMND).");
    }

    public static void ValidateEmail(string? email, bool required = true, string fieldName = "Email")
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            if (required)
                throw new ArgumentException($"{fieldName} không được để trống.");
            return;
        }

        var clean = email.Trim();
        if (!EmailRegex.IsMatch(clean))
            throw new ArgumentException($"{fieldName} không đúng định dạng.");
    }

    public static void ValidatePositiveNumber(decimal val, string fieldName = "Số tiền", decimal min = 0)
    {
        if (val < min)
            throw new ArgumentException($"{fieldName} không được nhỏ hơn {min}.");
    }
}

