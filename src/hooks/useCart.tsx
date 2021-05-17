import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const haveInCart = cart.find((product) => product.id === productId);
      
      if (haveInCart) {
        updateProductAmount({productId, amount: haveInCart.amount + 1});
        return;
      }
      
      const { data: response } = await api.get<Product>(`products/${productId}`);
      const { data: stockProduct } = await api.get<Stock>(`stock/${productId}`);

      if (stockProduct.amount <= 0) {
        throw new Error();
      }

      const product = { ...response, amount: 1 };
      const products = [...cart, product];
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

      setCart(products);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const haveInCart = cart.find((product) => product.id === productId);

      if (!haveInCart) {
        throw new Error();
      }

      const products = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      setCart(products);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const product = cart.find(product => product.id === productId);
      
      if (!product || stock.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }
      if (amount <= 1) {
        throw new Error();
      }

      const products = cart.map(productCurrent => productCurrent.id === productId ? {...product, amount} : productCurrent);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

      setCart(products);
    } catch(error) {
      if (error.message) {
        toast.error(error.message);
      }

      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
