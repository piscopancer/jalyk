// compound of db row (stores ref) and s3 info
export type Asset = {
  size: number
  name: string
  createdAt: string
}
// & (
//   | {
//       type: 'image'
//       url: string
//     }
//   | {
//       type: 'other'
//     }
// )
