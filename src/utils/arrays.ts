const rearrangeArray = (newStartIndex: number, arr: unknown[]) => {
  return [...arr.slice(newStartIndex), ...arr.slice(0, newStartIndex)];
};

// [0, 1, 2, 3, 4]
// newIndex = 2
// expected output = [2, 3, 4, 0 ,1]

// [2, 3, 4, 0, 1]

export {rearrangeArray};
