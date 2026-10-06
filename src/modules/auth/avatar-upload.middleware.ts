import multer from "multer";
import { AppError } from "../../middleware/error.middleware";

const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "Avatar must be a JPEG, PNG, WebP, or GIF image"));
      return;
    }

    callback(null, true);
  }
});
