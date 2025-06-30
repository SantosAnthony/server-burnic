import cors from 'cors'
import express from 'express'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

import Stripe from 'stripe'
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const app = express()
const PORT = 3000
const supabase = createClient('https://gohvpfzeqytzypsrgkps.supabase.co', process.env.SUPABASEKEY)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(express.static('public')) // Serve HTML, JS, CSS

app.use(cors())

app.post('/payment', async (req, res) => {
  try {
    const { name, price } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name },
          unit_amount: Math.round(price * 100), // em centavos
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:5500/index.html',
      cancel_url: 'http://localhost:5500/index.html',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar sessão de pagamento');
  }
});

app.post('/sendMail', async (req, res) => {
  const dados = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'gabrielaraujo05585@gmail.com',
      pass: 'gabzinhogamer'
    }
  });

  const html = `
    <h2>🧾 Comprovante de Pedido</h2>
    <p><strong>Produto:</strong> ${dados.produto}</p>
    <p><strong>Valor Total:</strong> ${dados.total}</p>
    <p><strong>Endereço:</strong> ${dados.rua}, ${dados.numero}, ${dados.bairro}, ${dados.cidade} - CEP ${dados.cep}</p>
  `;

  await transporter.sendMail({
    from: dados.email || 'cliente@exemplo.com',
    to: "gabrielaraujo05585@gmail.com",
    subject: 'Comprovante de pedido - Burnic',
    html
  });

  console.log('E-mail de comprovante enviado.');
  res.sendStatus(200);
});







// Rota API: Retorna JSON dos produtos
app.get('/produtos', async (req, res) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    console.log('Usuário está logado')
    console.log('Token JWT:', session.access_token)
  } else {
    console.log('Usuário não está logado')
  }
  
  const { data, error } = await supabase.from('produtos').select('*')

  if (error) return res.status(500).json({ error })
  res.json(data)
})

app.get('/produtos/:id', async (req, res) => {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', req.params.id)

  if (error) return res.status(500).json({ error })
  res.json(data)
})

app.post('/produtos', async (req, res) => {
  const { data, error } = await supabase
  .from('produtos')
  .insert([
    { name: req.body.name, 
      price: req.body.price,
      promoPrice: req.body.promoPrice,
      promo: req.body.promo,
      class: req.body.classe,
      image: req.body.image 
      }
  ])
  .select()

  if (error) return res.status(500).json({ error })
  res.json(data)
})

app.delete('/produtos/:id', async (req, res) => {
  const { error } = await supabase
  .from('produtos')
  .delete()
  .eq('id', req.params.id)

  if (error) return res.status(500).json({ error })
  return res.json()
})


app.patch('/produtos/:id', async (req, res) => {
  const { data, error } = await supabase
  .from('produtos')
  .update({ 
    name: req.body.name, 
    price: req.body.price,
    promoPrice: req.body.promoPrice,
    promo: req.body.promo,
    class: req.body.class,
    image: req.body.image
  })
  .eq('id', req.params.id)
  .select()

  console.log(data)

  if (error) return res.status(500).json({ error })
})


app.listen(PORT, async () => {


  console.log(`Servidor rodando em`)
})

app.post('/Register', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: req.body.email,
      password: req.body.password,
    });

    if (error) {
      return res.status(400).json({ sucesso: false, erro: error.message });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Cadastro criado. Verifique seu e-mail para confirmar.",
      usuario: data,
    });

  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: "Erro inesperado no servidor." });
  }
});



async function loginHandler(req, res) {
  const { email, password, nome } = req.body;

  try {
    // 1. Login com e-mail e senha
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const user = data.user;

    // 2. Verificar se o perfil já existe
    const { data: existingProfile, error: profileError } = await supabase
      .from('profile')
      .select('id')
      .eq('id', user.id)
      .single();

    // 3. Se não existir, criar o perfil
    if (profileError && profileError.code === 'PGRST116') {
      // código 'PGRST116' = registro não encontrado
      const { error: insertError } = await supabase.from('profile').insert({
        id: user.id,
        nome: nome || 'Sem nome',
        is_admin: false,
      });

      if (insertError) {
        console.error('Erro ao criar perfil:', insertError.message);
        return res.status(500).json({ error: 'Erro ao criar perfil.' });
      }
    }

    // 4. Retornar sucesso
    return res.status(200).json({
      message: 'Login realizado com sucesso.',
      user,
      session: data.session,
    });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro inesperado no servidor.' });
  }
}

app.post('/Login', loginHandler);

