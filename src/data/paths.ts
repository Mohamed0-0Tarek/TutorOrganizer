export const userPath = (uid: string) => `users/${uid}`;
export const groupsPath = (uid: string) => `users/${uid}/groups`;
export const studentsPath = (uid: string) => `users/${uid}/students`;
export const sessionsPath = (uid: string) => `users/${uid}/sessions`;
export const attendancePath = (uid: string) => `users/${uid}/attendance`;
export const paymentsPath = (uid: string) => `users/${uid}/payments`;
export const aiUsagePath = (uid: string) => `users/${uid}/meta/aiUsage`;

export const groupDocPath = (uid: string, groupId: string) =>
  `${groupsPath(uid)}/${groupId}`;
export const studentDocPath = (uid: string, studentId: string) =>
  `${studentsPath(uid)}/${studentId}`;
export const sessionDocPath = (uid: string, sessionId: string) =>
  `${sessionsPath(uid)}/${sessionId}`;
export const attendanceDocPath = (uid: string, attendanceId: string) =>
  `${attendancePath(uid)}/${attendanceId}`;
export const paymentDocPath = (uid: string, paymentId: string) =>
  `${paymentsPath(uid)}/${paymentId}`;
