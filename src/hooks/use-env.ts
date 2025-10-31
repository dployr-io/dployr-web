import { useState } from "react";

export function useEnv() {
    // Mock config data - replace with actual API call
    const config: Record<string, string> = {
        api_url: "https://api.example.com",
        database_url: "postgresql://localhost:5432/mydb",
        redis_url: "redis://localhost:6379",
        jwt_secret: "your-secret-key",
    };

    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    const handleEdit = (key: string) => {
        setEditingKey(key);
        setEditValue(config[key] || "");
    };

    const handleSave = (key: string) => {
        // TODO: Implement actual save logic
        console.log(`Saving ${key}: ${editValue}`);
        setEditingKey(null);
        setEditValue("");
    };

    const handleCancel = () => {
        setEditingKey(null);
        setEditValue("");
    };

    const handleKeyboardPress = (e: React.KeyboardEvent, key: string) => {
        if (e.key === "Enter") {
            handleSave(key);
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return {
        config,
        editingKey,
        editValue,
        setEditValue,
        handleEdit,
        handleSave,
        handleKeyboardPress,
        handleCancel,
    };
}