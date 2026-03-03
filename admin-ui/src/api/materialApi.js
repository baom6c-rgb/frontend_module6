// src/api/materialApi.js
import axiosPrivate from "./axiosPrivate";

export const materialApi = {
    // =========================
    // STUDENT (Practice dùng)
    // =========================
    upload: (file, onProgress) => {
        const fd = new FormData();
        fd.append("file", file);

        return axiosPrivate.post("/student/materials/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
                if (!e.total) return;
                const percent = Math.round((e.loaded * 100) / e.total);
                onProgress?.(percent);
            },
        });
    },

    // paste text -> create material (STUDENT)
    createFromText: ({ title, rawText }) => {
        return axiosPrivate.post("/student/materials/text", { title, rawText });
    },

    // đọc lại văn bản đã trích xuất (STUDENT)
    getExtractedText: (materialId) => {
        return axiosPrivate.get(`/student/materials/${materialId}/text`);
    },

    // =========================
    // ADMIN (Admin tạo đề dùng)
    // =========================
    uploadAdmin: (file, onProgress) => {
        const fd = new FormData();
        fd.append("file", file);

        // ✅ đúng BE: /api/admin/materials/upload (axiosPrivate baseURL đã có /api)
        return axiosPrivate.post("/admin/materials/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
                if (!e.total) return;
                const percent = Math.round((e.loaded * 100) / e.total);
                onProgress?.(percent);
            },
        });
    },

    // paste text -> create material (ADMIN)
    // BE của m đang nhận CreateTextMaterialRequest: { title, rawText }
    createFromTextAdmin: ({ title, rawText }) => {
        return axiosPrivate.post("/admin/materials/text", { title, rawText });
    },

    // đọc extracted text (ADMIN) - chỉ cần nếu admin cần xem text đã extract
    // nếu BE chưa implement endpoint này thì để lại cũng không sao, đừng gọi là được
    getExtractedTextAdmin: (materialId) => {
        return axiosPrivate.get(`/admin/materials/${materialId}/text`);
    },
};