const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(/@db\.TimestampTz/g, '@db.Timestamptz');
schema += `

model StatusConfig {
  id String @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId String @unique @map("user_id") @db.Uuid
  enabled Boolean @default(false)
  actionType ActionType? @default(view_and_like) @map("action_type")
  defaultEmoji String @default("❤️") @map("default_emoji") @db.VarChar(10)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("status_config")
}
`;
fs.writeFileSync('prisma/schema.prisma', schema);
