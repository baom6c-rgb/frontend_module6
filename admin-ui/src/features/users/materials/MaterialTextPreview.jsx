import { useState } from "react";
import UploadMaterial from "./UploadMaterial";
import MaterialTextPreview from "./MaterialTextPreview";

export default function StudentMaterialsPage() {
    const [materialId, setMaterialId] = useState(null);

    return (
        <>
            <UploadMaterial
                onUploaded={(id) => setMaterialId(id)}
            />

            {materialId && (
                <MaterialTextPreview materialId={materialId} />
            )}
        </>
    );
}
