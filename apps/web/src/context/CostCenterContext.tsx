import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { COST_CENTER_OPTIONS } from '../lib/masterLists';
import { brandForCostCenter, type OrganizationId } from '../lib/organizations';

export type CostCenterFilter = 'ALL' | 'BRICKRED' | 'AGYOM';

export { COST_CENTER_OPTIONS };

const STORAGE_KEY = 'cdt_cost_center';

type CostCenterContextValue = {
  costCenter: CostCenterFilter;
  setCostCenter: (value: CostCenterFilter) => void;
  /** Undefined when ALL — omit from API params */
  costCenterParam: string | undefined;
  /** Shell brand for the current filter. ALL stays the generic CDT theme. */
  brand: OrganizationId;
};

const CostCenterContext = createContext<CostCenterContextValue | null>(null);

function readStored(): CostCenterFilter {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'BRICKRED' || raw === 'AGYOM' || raw === 'ALL') return raw;
  } catch {
    /* ignore */
  }
  return 'ALL';
}

export function CostCenterProvider({ children }: { children: ReactNode }) {
  const [costCenter, setCostCenterState] = useState<CostCenterFilter>(readStored);

  const setCostCenter = useCallback((value: CostCenterFilter) => {
    setCostCenterState(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      costCenter,
      setCostCenter,
      costCenterParam: costCenter === 'ALL' ? undefined : costCenter,
      brand: brandForCostCenter(costCenter),
    }),
    [costCenter, setCostCenter],
  );

  return (
    <CostCenterContext.Provider value={value}>
      {children}
    </CostCenterContext.Provider>
  );
}

export function useCostCenter() {
  const ctx = useContext(CostCenterContext);
  if (!ctx) {
    throw new Error('useCostCenter must be used within CostCenterProvider');
  }
  return ctx;
}
