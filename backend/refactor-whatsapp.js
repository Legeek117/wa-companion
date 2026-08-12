const fs = require('fs');

let content = fs.readFileSync('src/services/whatsapp.service.ts', 'utf8');

// Replace contact lookup and insert
content = content.replace(
  /const { data: existingContact } = await supabase\s*\.from\('contacts'\)\s*\.select\('id'\)\s*\.eq\('user_id', userId\)\s*\.eq\('contact_id', remoteJid\)\s*\.single\(\);\s*let contactInternalId = existingContact\?\.id;\s*if \(\!contactInternalId && senderName\) \{\s*const \{ data: newContact \} = await supabase\s*\.from\('contacts'\)\s*\.insert\(\{\s*user_id: userId,\s*contact_id: remoteJid,\s*name: senderName,\s*platform: 'whatsapp',\s*\}\)\s*\.select\(\)\s*\.single\(\);\s*contactInternalId = newContact\?\.id;\s*\} else if \(existingContact && senderName\) \{\s*await supabase\s*\.from\('contacts'\)\s*\.update\(\{ name: senderName \}\)\s*\.eq\('id', contactInternalId\);\s*\}/s,
  `const existingContact = await prisma.contact.findFirst({
      where: { userId, contactId: remoteJid },
      select: { id: true }
    });

    let contactInternalId = existingContact?.id;

    if (!contactInternalId && senderName) {
      const newContact = await prisma.contact.create({
        data: {
          userId,
          contactId: remoteJid,
          name: senderName,
          platform: 'whatsapp',
        }
      });
      contactInternalId = newContact.id;
    } else if (contactInternalId && senderName) {
      await prisma.contact.update({
        where: { id: contactInternalId },
        data: { name: senderName }
      });
    }`
);

// Replace AppSheet sync query
content = content.replace(
  /const { data } = await supabase\.from\(source\.table\)\.select\(source\.fields\)\.eq\('user_id', userId\);/g,
  `const data = await prisma.$queryRawUnsafe(\`SELECT \${source.fields} FROM "\${source.table}" WHERE user_id = $1\`, userId);`
);

// Replace status_likes find
content = content.replace(
  /const \{ data: existingLike \} = await supabase\s*\.from\('status_likes'\)\s*\.select\('id'\)\s*\.eq\('status_id', statusId\)\s*\.eq\('user_id', userId\)\s*\.eq\('author_id', remoteJid\)\s*\.single\(\);/s,
  `const existingLike = await prisma.statusLike.findFirst({
          where: {
            statusId,
            userId,
            authorId: remoteJid
          }
        });`
);

// Replace status_likes insert
content = content.replace(
  /const insertData = \{\s*status_id: statusId,\s*user_id: userId,\s*author_id: remoteJid,\s*emoji: reactionEmoji,\s*\/\/ store the raw timestamp so we know when the reaction happened\s*reacted_at: new Date\(timestamp \* 1000\)\.toISOString\(\)\s*\};\s*const \{ error \} = await supabase\.from\('status_likes'\)\.insert\(insertData\);/s,
  `const insertData = {
      statusId,
      userId,
      authorId: remoteJid,
      emoji: reactionEmoji,
      // store the raw timestamp so we know when the reaction happened
      reactedAt: new Date(timestamp * 1000)
    };
    
    try {
      await prisma.statusLike.create({ data: insertData });
    } catch (error: any) {`
);

// Handle the if (error) logic below it
content = content.replace(
  /if \(error\) \{\s*logger\.error\(`\[WhatsApp\] Error storing status like in database:`, error\);\s*\}/s,
  `logger.error(\`[WhatsApp] Error storing status like in database:\`, error);
    }`
);

// Replace getStatusLikes query
content = content.replace(
  /const \{ data: statusLikes, error \} = await supabase\s*\.from\('status_likes'\)\s*\.select\('\*'\)\s*\.eq\('user_id', userId\)\s*\.order\('created_at', \{ ascending: false \}\)\s*\.limit\(limit\);\s*if \(error\) throw error;/s,
  `const statusLikes = await prisma.statusLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });`
);

// Replace reconnectAllSessionsForAllUsers query
content = content.replace(
  /const \{ data: sessions, error \} = await supabase\s*\.from\('whatsapp_sessions'\)\s*\.select\('user_id, status'\);\s*if \(error\) \{\s*throw error;\s*\}/s,
  `const sessions = await prisma.whatsappSession.findMany({
      select: { userId: true, status: true }
    });`
);

// Replace deleteStatusLike queries
content = content.replace(
  /const \{ data: statusLikeData, error: findError \} = await supabase\s*\.from\('status_likes'\)\s*\.select\('\*'\)\s*\.eq\('user_id', userId\)\s*\.eq\('status_id', statusId\)\s*\.eq\('author_id', authorId\)\s*\.single\(\);\s*if \(findError \|\| !statusLikeData\) \{\s*logger\.error\(`\[WhatsApp\] Status like not found in database:`, findError\);\s*throw new Error\('Status like not found'\);\s*\}\s*\/\/ Also get the contact ID for the author\s*const \{ data: contactData \} = await supabase\s*\.from\('contacts'\)\s*\.select\('contact_id'\)\s*\.eq\('user_id', userId\)\s*\.eq\('id', statusLikeData\.author_id\)\s*\.single\(\);\s*const remoteJid = contactData\?\.contact_id \|\| statusLikeData\.author_id;\s*\/\/ Delete from database\s*const \{ error: deleteError \} = await supabase\s*\.from\('status_likes'\)\s*\.delete\(\)\s*\.eq\('id', statusLikeData\.id\);\s*if \(deleteError\) \{\s*logger\.error\(`\[WhatsApp\] Error deleting status like:`, deleteError\);\s*throw deleteError;\s*\}/s,
  `const statusLikeData = await prisma.statusLike.findFirst({
      where: { userId, statusId, authorId }
    });
      
    if (!statusLikeData) {
      logger.error(\`[WhatsApp] Status like not found in database:\`);
      throw new Error('Status like not found');
    }
    
    // Also get the contact ID for the author
    const contactData = await prisma.contact.findFirst({
      where: { userId, id: statusLikeData.authorId },
      select: { contactId: true }
    });
      
    const remoteJid = contactData?.contactId || statusLikeData.authorId;
    
    // Delete from database
    try {
      await prisma.statusLike.delete({
        where: { id: statusLikeData.id }
      });
    } catch (deleteError) {
      logger.error(\`[WhatsApp] Error deleting status like:\`, deleteError);
      throw deleteError;
    }`
);

// Map the old snake_case object to what the caller expects in getStatusLikes
content = content.replace(
  /return statusLikes \|\| \[\];/g,
  `return (statusLikes || []).map(like => ({
      id: like.id,
      status_id: like.statusId,
      user_id: like.userId,
      author_id: like.authorId,
      emoji: like.emoji,
      reacted_at: like.reactedAt?.toISOString(),
      created_at: like.createdAt.toISOString()
    }));`
);

fs.writeFileSync('src/services/whatsapp.service.ts', content, 'utf8');
console.log('Done refactoring whatsapp.service.ts');
