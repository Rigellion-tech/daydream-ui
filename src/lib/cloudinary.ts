// /src/lib/cloudinary.ts
export async function uploadImageToCloudinary(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "daydream_unsigned"); // change if needed
  
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dozjqiamj/image/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return null;
    }
  }
  