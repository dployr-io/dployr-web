import { useState } from "react";
import { z } from "zod";

const instanceFormSchema = z.object({
  address: z.string().min(10, "Address with a minimum of 10 characters is required").max(16, "Address must be a maximum of 16 characters"),
  tag: z.string().min(3, "Tag with a minimum of 3 characters is required").max(15, "Tag must be a maximum of 15 characters")
});

export function useInstancesForm() {
  const [error, setError] = useState<string>("");
  const [address, setAddress] = useState("");
  const [tag, setTag] = useState("");
  const [publicKey, setPublicKey] = useState("");

  const validateForm = () => {
    const result = instanceFormSchema.safeParse({ address, tag, publicKey });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setError(
        fieldErrors.address?.[0] ||
          fieldErrors.tag?.[0] ||
          "Validation failed",
      );
      return false;
    }

    setError("");
    return true;
  };

  const getFormData = () => {
    if (!validateForm()) return null as null | { address: string; tag: string; publicKey: string };
    return { address, tag, publicKey };
  };

  return {
    address,
    tag,
    publicKey,
    validationError: error,
    setAddress,
    setTag,
    setPublicKey,
    getFormData,
  };
}
