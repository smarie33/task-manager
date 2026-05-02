export const splitTaskOwners = (value?: string | null): string[] => {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(",")
        .map((owner) => owner.trim())
        .filter(Boolean)
    )
  );
};

export const joinTaskOwners = (owners: string[]): string => {
  return splitTaskOwners(owners.join(", ")).join(", ");
};

export const hasTaskOwner = (value: string | null | undefined, owner: string | null | undefined): boolean => {
  const target = String(owner ?? "").trim();
  if (!target) return false;
  return splitTaskOwners(value).includes(target);
};

export const formatTaskOwners = (value?: string | null): string => {
  const owners = splitTaskOwners(value);
  return owners.length > 0 ? owners.join(", ") : "";
};
