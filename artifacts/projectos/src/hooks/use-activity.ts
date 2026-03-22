import { useQuery } from "@tanstack/react-query";

const API = `${import.meta.env.BASE_URL}api`;

export function useActivityLog(entityType?: string, entityId?: number) {
  return useQuery({
    queryKey: ["activity", entityType, entityId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (entityId) params.set("entityId", entityId.toString());
      const res = await fetch(`${API}/activity?${params.toString()}`);
      return res.json();
    },
    enabled: !!entityType && !!entityId,
  });
}
