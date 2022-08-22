const degreesToRadians = (degrees: number) => {
  const radians = degrees % 360;
  return (radians * Math.PI) / 180;
};

const radiansToDegrees = (radians: number): number => {
  const degrees = radians % (2 * Math.PI);
  return (degrees * 180) / Math.PI;
};

const kilometerToRadians = (distance: number): number => {
  return distance / 6371;
};

export {degreesToRadians, radiansToDegrees, kilometerToRadians};
