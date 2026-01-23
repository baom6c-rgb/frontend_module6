import axiosPrivate from "./axiosPrivate";

export const materialApi = {
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

    // ✅ US9: đọc lại văn bản đã trích xuất
    getExtractedText: (materialId) => {
        return axiosPrivate.get(`/student/materials/${materialId}/text`);
    },
};
