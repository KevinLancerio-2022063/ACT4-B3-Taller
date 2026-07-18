export function isAllowedEmailDomain(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const lower = email.toLowerCase().trim();
    const allowed = ["@gmail.com", "@outlook.com", "@yahoo.com"];
    return allowed.some(d => lower.endsWith(d));
}
