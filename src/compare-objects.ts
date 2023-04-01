// Compare two objects by a combination of keys and values
function compareObjects(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
): number {
  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();

  // If objects have different number of keys, they cannot be the same
  if (keys1.length !== keys2.length) {
    return keys1.length - keys2.length;
  }

  for (let i = 0; i < keys1.length; i++) {
    const key1 = keys1[i];
    const key2 = keys2[i];

    // If objects have different keys, they cannot be the same
    if (key1 !== key2) {
      return key1.localeCompare(key2);
    }

    const value1 = obj1[key1];
    const value2 = obj2[key2];

    // If values are not the same, objects are not the same
    if (value1 !== value2) {
      return value1 > value2 ? 1 : -1;
    }
  }

  return 0;
}

export function arraysHaveSameContent<T extends Record<string, unknown>>(
  arr1: T[],
  arr2: T[]
): boolean {
  // If arrays have different length, they cannot have the same content
  if (arr1.length !== arr2.length) {
    return false;
  }

  // Sort both arrays by a combination of keys and values to compare them
  const sortedArr1 = arr1.slice().sort(compareObjects);
  const sortedArr2 = arr2.slice().sort(compareObjects);

  // Compare each object in both arrays
  for (let i = 0; i < sortedArr1.length; i++) {
    if (compareObjects(sortedArr1[i], sortedArr2[i]) !== 0) {
      return false;
    }
  }

  return true;
}
