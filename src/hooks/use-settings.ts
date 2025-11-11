import { useState } from "react";

export function useSettings() {
    const [editMode, setEditMode] = useState<boolean>(false);

    return {
        editMode,
        setEditMode,
    }
}