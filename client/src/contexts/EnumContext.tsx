import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import type { EnumOption, EnumGroupKey } from "@shared/enums";
import { DEFAULT_ENUMS, getBadgeClass as _getBadgeClass, getHexColor as _getHexColor } from "@shared/enums";

type EnumContextValue = Record<EnumGroupKey, EnumOption[]>;

const EnumContext = createContext<EnumContextValue>(DEFAULT_ENUMS);

export function EnumProvider({ children }: { children: ReactNode }) {
    const { data } = trpc.enums.list.useQuery(undefined, {
        staleTime: 60_000, // cache for 1 minute
    });

    const value: EnumContextValue = data ?? DEFAULT_ENUMS;

    return (
        <EnumContext.Provider value={value}>
            {children}
        </EnumContext.Provider>
    );
}

/** Hook to access all configurable enum groups. */
export function useEnums() {
    return useContext(EnumContext);
}

/** Get the badge classes for a status/priority label. */
export function useStatusBadgeClass(group: EnumGroupKey, label: string): string {
    const enums = useEnums();
    return _getBadgeClass(enums[group], label);
}

export { _getBadgeClass as getBadgeClass, _getHexColor as getHexColor };
