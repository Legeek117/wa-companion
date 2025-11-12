# 🔧 Dépannage Authentification - 401 Unauthorized

## ⚠️ Erreur 401 (Unauthorized)

L'erreur **401 Unauthorized** signifie que l'authentification a échoué. Cela peut être dû à plusieurs raisons :

### 1. L'utilisateur n'existe pas encore

**Solution** : Vous devez d'abord **vous inscrire** avant de pouvoir vous connecter.

#### Test d'Inscription
1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet **"Inscription"**
3. Remplissez le formulaire :
   - Email : `test@example.com`
   - Mot de passe : `Test1234` (minimum 8 caractères, avec majuscule, minuscule et chiffre)
4. Cliquez sur **"Créer mon compte"**

**Résultat attendu** :
- ✅ Toast : "Compte créé avec succès ! Bienvenue 🎉"
- ✅ Redirection vers `/dashboard`
- ✅ Token stocké dans localStorage

#### Ensuite, testez la connexion
1. Allez sur `http://localhost:8081/auth`
2. Cliquez sur l'onglet **"Connexion"**
3. Utilisez les mêmes identifiants que lors de l'inscription
4. Cliquez sur **"Se connecter"**

### 2. Le mot de passe est incorrect

**Solution** : Vérifiez que vous utilisez le bon mot de passe.

**Note** : Le mot de passe doit respecter ces critères :
- Minimum 8 caractères
- Au moins une majuscule
- Au moins une minuscule
- Au moins un chiffre

### 3. L'email n'existe pas dans la base de données

**Solution** : Créez d'abord un compte avec l'inscription.

## 🧪 Tests à Effectuer

### Test 1 : Inscription
```bash
# Via curl (optionnel)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234\"}"
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "plan": "free"
    },
    "token": "jwt-token-here"
  },
  "message": "User registered successfully"
}
```

### Test 2 : Connexion (après inscription)
```bash
# Via curl (optionnel)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234\"}"
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "plan": "free"
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

## 🔍 Vérification

### Vérifier que l'utilisateur existe dans Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Table Editor** → **users**
4. Vérifiez que votre utilisateur existe

### Vérifier les logs du serveur

Regardez les logs du serveur backend pour voir les erreurs détaillées :
- Erreurs de validation
- Erreurs de connexion à Supabase
- Erreurs d'authentification

## ✅ Checklist

- [ ] Serveur backend démarré sur `http://localhost:3000`
- [ ] Frontend connecté au backend
- [ ] Test d'inscription effectué
- [ ] Utilisateur créé dans Supabase
- [ ] Test de connexion effectué
- [ ] Token stocké dans localStorage

## 🎯 Prochaines Étapes

1. **Inscrivez-vous d'abord** si c'est la première fois
2. **Ensuite, connectez-vous** avec les mêmes identifiants
3. **Vérifiez que le token est stocké** dans localStorage

## 💡 Astuce

Si vous avez déjà un compte mais que vous ne vous souvenez plus du mot de passe :
- Créez un nouveau compte avec un autre email
- Ou réinitialisez le mot de passe (fonctionnalité à implémenter)








