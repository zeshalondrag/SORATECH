import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-secondary mt-auto">
      <div className="container mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">
              SORA<span className="text-primary">TECH</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Интернет-магазин комплектующих для ПК
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Каталог</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalog/cpu" className="text-muted-foreground hover:text-primary transition-colors">
                  Процессоры
                </Link>
              </li>
              <li>
                <Link to="/catalog/gpu" className="text-muted-foreground hover:text-primary transition-colors">
                  Видеокарты
                </Link>
              </li>
              <li>
                <Link to="/catalog/motherboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Материнские платы
                </Link>
              </li>
              <li>
                <Link to="/catalog/ram" className="text-muted-foreground hover:text-primary transition-colors">
                  Память
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Информация</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  О компании
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="text-muted-foreground hover:text-primary transition-colors">
                  Доставка и оплата
                </Link>
              </li>
              <li>
                <Link to="/warranty" className="text-muted-foreground hover:text-primary transition-colors">
                  Гарантия
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="text-muted-foreground hover:text-primary transition-colors">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>8 (800) 555-35-35</li>
              <li>support@soratech.ru</li>
              <li>Пн-Пт: 10:00-20:00</li>
              <li>Сб: 10:00-17:00</li>
              <li>Вс: выходной</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 SORA Tech. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};
