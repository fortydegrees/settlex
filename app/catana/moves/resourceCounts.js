export const countResources = (resources = []) =>
  resources.reduce((acc, resource) => {
    acc[resource] = (acc[resource] ?? 0) + 1;
    return acc;
  }, {});
