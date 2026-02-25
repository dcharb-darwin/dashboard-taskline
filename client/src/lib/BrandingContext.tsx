import { createContext, useContext, useEffect, type ReactNode } from "react";
import { trpc } from "./trpc";

type BrandingContextValue = {
    appName: string;
    logoUrl: string | null;
    isLoading: boolean;
    /** Call after updating branding to refetch */
    refetch: () => void;
};

const BrandingContext = createContext<BrandingContextValue>({
    appName: "Darwin TaskLine",
    logoUrl: null,
    isLoading: true,
    refetch: () => { },
});

export function BrandingProvider({ children }: { children: ReactNode }) {
    const { data, isLoading, refetch } = trpc.branding.get.useQuery(undefined, {
        staleTime: 60_000,
    });

    const appName = data?.appName ?? "Darwin TaskLine";
    const logoUrl = data?.logoUrl ?? null;

    // Sync document.title
    useEffect(() => {
        document.title = appName;
    }, [appName]);

    return (
        <BrandingContext.Provider value={{ appName, logoUrl, isLoading, refetch }}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    return useContext(BrandingContext);
}
