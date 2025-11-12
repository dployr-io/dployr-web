import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from '@/lib/toast';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    handleSubmit: () => void;
}

interface EmailChip {
    id: string;
    email: string;
}

export default function InviteUserDialog({ open, onOpenChange, handleSubmit }: Props) {
    const [inputValue, setInputValue] = useState('');
    const [emailChips, setEmailChips] = useState<EmailChip[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false)

    const parseEmails = (value: string) => {
        const emails = value
            .split(/[, ]+/)
            .map(email => email.trim())
            .filter(email => email.length > 0);

        // 5 unique emails
        const existingEmails = emailChips.map(chip => chip.email);
        const newEmails = emails
            .filter(email => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email) && !existingEmails.includes(email);
            })
            .slice(0, 5 - emailChips.length);

        if (newEmails.length > 0) {
            const newChips = newEmails.map(email => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                email
            }));
            setEmailChips([...emailChips, ...newChips]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        
        // Parse emails when comma or space is added
        if (value.includes(',') || value.includes(' ')) {
            parseEmails(value);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && inputValue === '' && emailChips.length > 0) {
            // backspace removes last entry
            setEmailChips(emailChips.slice(0, -1));
        }
    };

    const removeChip = (chipId: string) => {
        setEmailChips(emailChips.filter(chip => chip.id !== chipId));
    };

    const onSubmit = async () => {
        if (emailChips.length === 0) return;

        setIsSubmitting(true);
        try {
            handleSubmit();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to send invites. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setEmailChips([]);
            setInputValue('');
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Invite Users
                    </DialogTitle>
                    <DialogDescription>
                        Enter email addresses to invite them to join your cluster. You can add up to 5 users at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <Field>
                        <FieldLabel htmlFor="emails">Email Addresses</FieldLabel>
                        <div className="relative">
                            <Input
                                id="emails"
                                type="text"
                                placeholder="Enter emails separated by comma or space..."
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={isSubmitting}
                                className="pr-10"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                                {emailChips.length}/5
                            </div>
                        </div>
                    </Field>

                    {/* Email Chips */}
                    {emailChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 min-h-10 p-2 border rounded-md bg-muted/20">
                            {emailChips.map((chip) => (
                                <div
                                    key={chip.id}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                >
                                    <span className="truncate max-w-[200px]">{chip.email}</span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 hover:bg-primary/20 rounded-full"
                                        onClick={() => removeChip(chip.id)}
                                        disabled={isSubmitting}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Helper text */}
                    <div className="text-sm text-muted-foreground">
                        Type email addresses separated by commas or spaces
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting || emailChips.length === 0}
                    >
                        {isSubmitting ? 'Sending Invites...' : `Send ${emailChips.length > 0 ? `(${emailChips.length})` : ''} Invite${emailChips.length !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}