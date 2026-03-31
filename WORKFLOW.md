# 🚨 WORKFLOW OBLIGATOIRE — LIRE AVANT DE COMMENCER

## ⚠️ QUESTION OBLIGATOIRE

**Avant chaque tâche, demande :**
> "On travaille sur STAGING (test) ou PRODUCTION ?"

---

## 🔴 PRODUCTION (Somneo)

| Élément | Valeur |
|---------|--------|
| GitHub | https://github.com/khaleddesign/Somneo |
| Vercel | app.somnoventis.com |
| Supabase | wzvvdbbdnlhjqpydqvur.supabase.co |

### RÈGLES PRODUCTION
- ❌ NE JAMAIS push directement sur main
- ❌ NE JAMAIS merger sans avoir testé sur staging
- ✅ Toujours créer une branche
- ✅ Toujours tester sur staging d'abord

---

## 🟢 STAGING (Somneo-Staging)

| Élément | Valeur |
|---------|--------|
| GitHub | https://github.com/khaleddesign/Somneo-Staging |
| Vercel | somneo-staging.vercel.app |
| Supabase | beclybuiwkxnydfblwka.supabase.co |

### Comptes de test
| Email | Password | Rôle |
|-------|----------|------|
| admin@test.com | Test123! | admin |
| agent@test.com | Test123! | agent |
| client@test.com | Test123! | client |

### RÈGLES STAGING
- ✅ Tu peux push sur main
- ✅ Tu peux tester librement
- ✅ Tu peux casser sans conséquence

---

## 📋 CHECKLIST AVANT CHAQUE TÂCHE

- [ ] J'ai demandé : "STAGING ou PRODUCTION ?"
- [ ] J'ai vérifié sur quel repo je travaille
- [ ] Si PRODUCTION : j'ai créé une branche
- [ ] Si PRODUCTION : je teste d'abord sur STAGING

---

## 🔄 WORKFLOW RECOMMANDÉ

### Pour une nouvelle feature ou correction :

1. **Développe sur STAGING**
```bash
cd Somneo-Staging
# Fais tes modifications
git add .
git commit -m "feat: description"
git push origin main
```

2. **Teste sur staging**
   - Va sur somneo-staging.vercel.app
   - Connecte-toi avec admin@test.com / Test123!
   - Vérifie que tout marche

3. **Si OK, copie vers PRODUCTION**
```bash
cd Somneo
git checkout -b feat/nom-feature
# Copie les fichiers modifiés depuis Somneo-Staging
git add .
git commit -m "feat: description"
git push origin feat/nom-feature
```

4. **Teste sur Preview Vercel**
   - Vercel crée automatiquement une URL de preview
   - Vérifie que tout marche

5. **Merge dans main**
   - Seulement après validation !

---

## 🚨 EN CAS DE DOUTE

**STOP. Demande confirmation à Khaled.**

Ne jamais forcer un push ou un merge si tu n'es pas sûr.
