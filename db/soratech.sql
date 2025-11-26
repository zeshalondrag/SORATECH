create extension if not exists pgcrypto;

--- Таблицы ---

create table roles (
    id serial primary key,
    role_name varchar(50) not null unique
);

create table users (
    id serial primary key,
    role_id int not null,
    foreign key (role_id) references roles (id),
    email varchar(255) not null unique check (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash varchar(255) not null,
    first_name varchar(20) not null,
	nickname varchar(20) not null unique,
    phone varchar(20) not null unique check (phone ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'),
    registration_date date not null default current_date,
	is_dark_theme boolean not null default false,
	currency varchar(3) not null default 'RUB' check (currency in ('RUB', 'USD'),
	deleted boolean not null default false
);

create table addresses (
    id serial primary key,
    user_id int unique,
    foreign key (user_id) references users (id),
    street varchar(200) not null,
    city varchar(100) not null,
    postal_code varchar(6) not null check (postal_code ~ '^\d{6}$'),
    country varchar(50) not null default 'Россия' check (country in ('Россия'))
);

create table delivery_types (
    id serial primary key,
    delivery_type_name varchar(50) not null unique check (delivery_type_name in ('Курьер', 'Самовывоз')),
    description text not null
);

create table payment_types (
    id serial primary key,
    payment_type_name varchar(50) not null unique check (payment_type_name in ('Наличные', 'Карта')),
    description text not null
);

create table categories (
    id serial primary key,
    name_category varchar(100) not null unique,
    description text not null,
	deleted boolean not null default false
);

create table suppliers (
    id serial primary key,
    name_supplier varchar(150) not null unique,
    contact_email varchar(255) not null unique check (contact_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone varchar(20) not null unique check (phone ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'),
	deleted boolean not null default false
);

create table products (
    id serial primary key,
    name_product varchar(200) not null,
	article varchar(6) not null unique,
    description text not null,
    price decimal(10,2) not null check (price > 0),
    stock_quantity int null default 0 check (stock_quantity >= 0),
	category_id int not null,
	foreign key (category_id) references categories (id),
    supplier_id int not null,
    foreign key (supplier_id) references suppliers (id),
    image_url text null,
	sales_count int not null default 0 check (sales_count >= 0),
	deleted boolean not null default false
);

create table characteristic (
    id serial primary key,
    name_characteristic varchar(100) not null unique,
    description text not null,
	deleted boolean not null default false
);

create table product_characteristic (
    id serial primary key,
    product_id int not null,
    characteristic_id int not null,
    description text not null,
    foreign key (product_id) references products (id) on delete cascade,
    foreign key (characteristic_id) references characteristic (id),
	deleted boolean not null default false
);

create table status_orders (
    id serial primary key,
    status_name varchar(50) not null unique check (status_name in ('Ожидает оплаты', 'Оплачен', 'Отправлен', 'Доставлен', 'Отменён'))
);

create table orders (
    id serial primary key,
	order_number varchar(20) not null unique,
    user_id int not null,
    foreign key (user_id) references users (id),
    order_date timestamp not null default current_timestamp,
    total_amount decimal(10,2) not null check (total_amount >= 0),
    status_order_id int not null default 1,
    foreign key (status_order_id) references status_orders (id),
    address_id int null,
    foreign key (address_id) references addresses (id),
    delivery_types_id int not null,
    foreign key (delivery_types_id) references delivery_types (id),
    payment_types_id int not null,
    foreign key (payment_types_id) references payment_types (id)
);

create table order_items (
    id serial primary key,
    order_id int not null,
    foreign key (order_id) references orders (id) on delete cascade,
    product_id int not null,
    foreign key (product_id) references products (id),
    quantity int not null check (quantity > 0),
    unit_price decimal(10,2) not null check (unit_price > 0)
);

create table reviews (
    id serial primary key,
    product_id int not null,
    foreign key (product_id) references products (id),
    user_id int not null,
    foreign key (user_id) references users (id),
    rating decimal(2,1) not null check (rating between 1 and 5),
    comment_text text null,
    review_date date not null default current_date,
	deleted boolean not null default false
);

create table cart (
    id serial primary key,
    user_id int not null,
	foreign key (user_id) references users (id) on delete cascade,
    product_id int not null,
	foreign key (product_id) references products (id) on delete cascade,
    quantity int not null check (quantity > 0),
    added_at timestamp default current_timestamp
);

create table favorites (
    id serial primary key,
    user_id int not null,
	foreign key (user_id) references users (id) on delete cascade,
    product_id int not null,
	foreign key (product_id) references products (id) on delete cascade,
    added_at timestamp default current_timestamp
);

create table if not exists audit_log (
    id serial primary key,
    table_name text not null,
    operation text not null,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    user_id int null,
    foreign key (user_id) references users (id),
    changed_at timestamp default now()
);

-- CRUD-операции (Тестовые данные) ---

insert into roles (role_name) values
('Администратор'),
('Менеджер'),
('Клиент');

select * from roles;

insert into users (role_id, email, password_hash, first_name, phone, registration_date) values
(1, 'admin@soratech.ru', 'admin_password', 'Фёдор', '+7 (495) 123-45-67', current_date),
(2, 'manager@soratech.ru', 'manager_password', 'Мария', '+7 (495) 234-56-78', current_date),
(3, 'test123@gmail.com', 'Qwerty@123', 'Дарья', '+7 (495) 345-67-89', current_date);

update users set email = 'updated_client@soratech.ru' where id = 3;

delete from users where id = 3;

select * from  users;

insert into addresses (user_id, street, city, postal_code, country) values
(1, 'ул. Остоженка, 24', 'Москва', '164994', 'Россия'),
(2, 'Пречистенский пер., 79', 'Москва', '189369', 'Россия'),
(3, 'Чистый пер., 10', 'Москва', '152690', 'Россия');

select * from  addresses;

insert into delivery_types (delivery_type_name, description) values
('Курьер', 'Доставка курьером по адресу'),
('Самовывоз', 'Самовывоз из пункта выдачи');

select * from  delivery_types;

insert into payment_types (payment_type_name, description) values
('Наличные', 'Оплата наличными при получении'),
('Карта', 'Оплата картой онлайн');

select * from  payment_types;

insert into categories (name_category, description) values
('Процессоры', 'Центральные процессоры (CPU) для настольных ПК и рабочих станций, определяющие производительность системы.'),
('Видеокарта', 'Графические ускорители (GPU) для обработки визуальной информации, игр, рендеринга и машинного обучения.'),
('Материнская плата', 'Основная плата, объединяющая все компоненты ПК и обеспечивающая взаимодействие между ними.'),
('Оперативная память', 'Модули RAM, обеспечивающие временное хранение данных и ускорение вычислений.'),
('Накопители SSD', 'Твердотельные накопители, обеспечивающие высокую скорость чтения и записи данных.'),
('Жёсткие диски (HDD)', 'Магнитные накопители для долговременного хранения больших объёмов данных.'),
('Система охлаждения', 'Кулеры, радиаторы и СЖО для охлаждения процессора, видеокарты и других компонентов.'),
('Блок питания', 'Источник питания (PSU), обеспечивающий стабильное электропитание всех компонентов ПК.'),
('Корпуса', 'Корпуса для сборки компьютеров различных форм-факторов с возможностью установки систем охлаждения и кабель-менеджмента.');

select * from  categories;

insert into suppliers (name_supplier, contact_email, phone) values
('AMD', 'amd@supplier.ru', '+7 (495) 456-78-90'),
('NVIDIA', 'nvidia@supplier.ru', '+7 (495) 567-89-01'),
('MSI', 'msi@supplier.ru', '+7 (495) 847-43-87');

select * from  suppliers;

insert into products (name_product, description, price, stock_quantity, category_id, supplier_id, image_url, sales_count) values
('AMD Ryzen 7 7800X3D OEM', 'Это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями. ', 33400.00, 10, 1, 1, 'https://example.com/rtx3080.jpg', 23),
('NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)', 'Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.', 131300.00, 20, 2, 2, 'https://example.com/i7.jpg', 12),
('MSI B850 GAMING PLUS WIFI', ' Эта материнская плата оснащена самыми передовыми технологиями и функциями, которые обеспечат вам незабываемый игровой опыт.', 21000.00, 15, 3, 3, 'https://example.com/asus.jpg',8);

update products set price = 12000.00 where id = 3;

delete from products where id = 3;

select * from  products;

insert into characteristic (name_characteristic, description) values
('Тактовая частота', 'Рабочая частота в ГГц'),
('Количество ядер', 'Для процессоров'),
('Объём памяти', 'Объем VRAM в ГБ'),
('Тип памяти', 'DDR4, GDDR6 и т.д.'),
('TDP', 'Вт');

select * from characteristic;

insert into product_characteristic (product_id, characteristic_id, description) values
(2, 3, '16 ГБ'),
(2, 4, 'GDDR7'),
(2, 5, '360 Вт'),
(1, 1, '4.2 ГГц'),
(1, 2, '8 ядер'),
(1, 5, '120 Вт');	

select * from product_characteristic;

insert into status_orders (status_name) values
('Ожидает оплаты'),
('Оплачен'),
('Отправлен'),
('Доставлен'),
('Отменён');

select * from  status_orders;

insert into orders (user_id, total_amount, status_order_id, address_id, delivery_types_id, payment_types_id) values
(3, 33400.00, 3, 3, 1, 2), 
(3, 131300.00, 1, 3, 2, 1),
(3, 21000.00, 4, 3, 1, 2);

update orders set total_amount = 12000.00 where id = 3;

delete from orders where id = 3;

select * from  orders;

insert into order_items (order_id, product_id, quantity, unit_price) values
(1, 1, 1, 33400.00),
(2, 2, 1, 131300.00),
(3, 3, 1, 21000.00);

select * from  order_items;

insert into reviews (product_id, user_id, rating, comment_text, review_date) values
(1, 3, 4.5, 'Процессор чёткий', current_date),
(2, 3, 5.0, 'Топовая видеокарта!', current_date),
(3, 3, 4.0, 'Хорошая материнская плата', current_date);

select * from  reviews;

--- Функции ---

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    pk_col text;
    pk_val text;
    current_user_id text;
BEGIN
    -- Получаем user_id из переменной сессии PostgreSQL
    -- TRUE означает: вернуть NULL вместо ошибки, если переменная не установлена
    BEGIN
        current_user_id := current_setting('app.current_user_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    -- Получаем имя первичного ключа
    SELECT a.attname INTO pk_col
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = tg_relid AND i.indisprimary
    LIMIT 1;

    IF tg_op = 'INSERT' THEN
        EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_val USING NEW;
        INSERT INTO audit_log(table_name, operation, record_id, new_data, user_id)
        VALUES (tg_table_name, tg_op, pk_val, to_jsonb(NEW), 
                CASE 
                    WHEN current_user_id IS NULL OR current_user_id = '' THEN NULL
                    ELSE current_user_id::INT
                END);
        RETURN NEW;
    ELSIF tg_op = 'UPDATE' THEN
        EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_val USING NEW;
        INSERT INTO audit_log(table_name, operation, record_id, old_data, new_data, user_id)
        VALUES (tg_table_name, tg_op, pk_val, to_jsonb(OLD), to_jsonb(NEW),
                CASE 
                    WHEN current_user_id IS NULL OR current_user_id = '' THEN NULL
                    ELSE current_user_id::INT
                END);
        RETURN NEW;
    ELSIF tg_op = 'DELETE' THEN
        EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_val USING OLD;
        INSERT INTO audit_log(table_name, operation, record_id, old_data, user_id)
        VALUES (tg_table_name, tg_op, pk_val, to_jsonb(OLD),
                CASE 
                    WHEN current_user_id IS NULL OR current_user_id = '' THEN NULL
                    ELSE current_user_id::INT
                END);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

create or replace function generate_product_article()
returns trigger as $$
declare
	generated_article varchar(6);
begin
	if new.article is null or new.article = '' then
		loop
			generated_article := lpad(floor(random() * 1000000)::text, 6, '0');
			exit when not exists (select 1 from products where article = generated_article);
		end loop;
		new.article := generated_article;
	end if;
	return new;
end;
$$ language plpgsql;

create or replace function generate_guest_nickname()
returns trigger as $$
declare
	generated_nickname varchar(20);
begin
	if new.nickname is null or new.nickname = '' then
		loop
			generated_nickname := 'Guest' || lpad((floor(random() * 1000000))::int::text, 6, '0');
			exit when not exists (select 1 from users where nickname = generated_nickname);
		end loop;
		new.nickname := generated_nickname;
	end if;
	return new;
end;
$$ language plpgsql;

create or replace function format_phone() returns trigger as $$
begin
    if new.phone is not null and new.phone !~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$' then
        new.phone := regexp_replace(
            regexp_replace(new.phone, '[^0-9]', '', 'g'),
            '^(7|8)?(\d{3})(\d{3})(\d{2})(\d{2})$',
            '+7 (\2) \3-\4-\5'
        );
        if new.phone !~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$' then
            raise exception 'Неверный формат номера телефона. Ожидается +7 (XXX) XXX-XX-XX';
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create or replace function generate_order_number() returns varchar as $$
begin
    return '№' || lpad(floor(random() * 100000000)::text, 6, '0');
end;
$$ language plpgsql;

create or replace function set_order_number() returns trigger as $$
begin
    new.order_number := generate_order_number();
    while exists (select 1 from orders where order_number = new.order_number) loop
        new.order_number := generate_order_number();
    end loop;
    return new;
end;
$$ language plpgsql;

--- Триггеры ---

create trigger trg_generate_product_article
before insert on products
for each row
execute function generate_product_article();

create trigger trg_generate_guest_nickname
before insert on users
for each row
execute function generate_guest_nickname();

create trigger trigger_format_user_phone
before insert or update on users
for each row execute function format_phone();

create trigger trigger_format_supplier_phone
before insert or update on suppliers
for each row execute function format_phone();

create trigger trigger_set_order_number
before insert on orders
for each row execute function set_order_number();

create trigger audit_users
after insert or update or delete on users
for each row
execute function audit_trigger_func();

create trigger audit_products
after insert or update or delete on products
for each row
execute function audit_trigger_func();

create trigger audit_orders
after insert or update or delete on orders
for each row
execute function audit_trigger_func();

create trigger audit_order_items
after insert or update or delete on order_items
for each row
execute function audit_trigger_func();

create trigger audit_reviews
after insert or update or delete on reviews
for each row
execute function audit_trigger_func();

create trigger audit_suppliers
after insert or update or delete on suppliers
for each row
execute function audit_trigger_func();

create trigger audit_categories
after insert or update or delete on categories
for each row
execute function audit_trigger_func();

create trigger audit_product_attributes
after insert or update or delete on product_characteristic
for each row
execute function audit_trigger_func();

--- Представления ---

create or replace view order_analytics_view as
select 
    o.id as "ID",
    u.first_name as "Клиент",
    o.order_date as "Дата заказа",
    o.total_amount as "Сумма заказа",
    s.status_name as "Статус",
    d.delivery_type_name as "Тип доставки",
    p.payment_type_name as "Тип оплаты",
    a.street || ', ' || a.city as "Адрес"
from orders o
join users u on o.user_id = u.id
join status_orders s on o.status_order_id = s.id
left join addresses a on o.address_id = a.id
join delivery_types d on o.delivery_types_id = d.id
join payment_types p on o.payment_types_id = p.id
order by o.order_date desc;

select * from order_analytics_view;

create or replace view product_analytics_view as
select 
    pr.id as "ID",
	pr.article as "Артикул",
    pr.name_product as "Название товара",
    pr.price as "Цена",
    pr.stock_quantity as "Остаток",
    coalesce(sum(oi.quantity), 0) as "Продано единиц",
    coalesce(sum(oi.quantity * oi.unit_price), 0) as "Выручка",
    c.name_category as "Категория",
    su.name_supplier as "Поставщик"
from products pr
left join order_items oi on pr.id = oi.product_id
left join categories c on pr.category_id = c.id
left join suppliers su on pr.supplier_id = su.id
group by pr.id, c.name_category, su.name_supplier
order by "Выручка" desc;

select * from product_analytics_view;

create or replace view review_analytics_view as
select 
    pr.id as "ID",
	pr.article as "Артикул",
    pr.name_product as "Название товара",
    avg(r.rating) as "Средний рейтинг",
    count(r.id) as "Количество отзывов",
    string_agg(r.comment_text, '; ') as "Комментарии"
from products pr
left join reviews r on pr.id = r.product_id
group by pr.id, pr.name_product
order by "Средний рейтинг" desc nulls last;

select * from review_analytics_view;

create or replace view product_full_view as
select 
    p.id,
	p.article,
    p.name_product,
    p.description,
    p.price,
    p.stock_quantity,
    s.name_supplier,
    string_agg(c.name_category, ', ') as categories,
    coalesce(
        string_agg(ch.name_characteristic || ': ' || pc.description, ', ' order by ch.name_characteristic),
        'Нет характеристик'
    ) as characteristics
from products p
left join suppliers s on p.supplier_id = s.id
left join categories c on p.category_id = c.id
left join product_characteristic pc on p.id = pc.product_id
left join characteristic ch on pc.characteristic_id = ch.id
group by 
    p.id,
	p.article,
    p.name_product,
    p.description,
    p.price,
    p.stock_quantity,
    s.name_supplier;

select * from product_full_view;

create or replace view order_full_view as
select 
    o.id,
    o.order_number,
    o.order_date,
    u.first_name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone,
    so.status_name as order_status,
    string_agg(p.name_product || ' (x' || oi.quantity || ')', ', ' order by p.name_product) as products,
    sum(oi.unit_price * oi.quantity) as total_amount
from orders o
join users u on o.user_id = u.id
join status_orders so on o.status_order_id = so.id
join order_items oi on o.id = oi.order_id
join products p on oi.product_id = p.id
group by 
    o.id,
    o.order_number,
    o.order_date,
    u.first_name,
    u.email,
    u.phone,
    so.status_name;
	
select * from order_full_view;

--- Процедуры ---

-- 1. Расчет выручки по категории товаров
create or replace procedure calculate_category_revenue(p_category_id int)
language plpgsql
as $$
declare
    v_revenue decimal(15,2);
    v_category_name varchar(100);
begin
    select name_category into v_category_name
    from categories
    where id = p_category_id and not deleted;
    
    if v_category_name is null then
        raise exception 'Категория с id % не найдена или удалена', p_category_id;
    end if;
    
    select coalesce(sum(oi.quantity * oi.unit_price), 0) into v_revenue
    from order_items oi
    join products p on oi.product_id = p.id
    where p.category_id = p_category_id
      and not p.deleted;
    
    raise notice 'Выручка по категории "%" (id: %): % руб.', v_category_name, p_category_id, v_revenue;
    
exception
    when others then
        raise exception 'Ошибка расчета выручки: %', sqlerrm;
end;
$$;

call calculate_category_revenue(1);

-- 2. Расчет общей прибыли по товару (выручка - себестоимость)
-- Предполагаем, что себестоимость = цена * 0.6 (60% от цены)
create or replace procedure calculate_product_profit(p_product_id int)
language plpgsql
as $$
declare
    v_product_name varchar(200);
    v_total_revenue decimal(15,2);
    v_total_cost decimal(15,2);
    v_profit decimal(15,2);
    v_cost_percentage decimal(5,2) := 0.6; 
begin
    select name_product into v_product_name
    from products
    where id = p_product_id and not deleted;
    
    if v_product_name is null then
        raise exception 'Товар с id % не найден или удален', p_product_id;
    end if;
    
    select coalesce(sum(oi.quantity * oi.unit_price), 0) into v_total_revenue
    from order_items oi
    where oi.product_id = p_product_id;
    
    select coalesce(sum(oi.quantity * oi.unit_price * v_cost_percentage), 0) into v_total_cost
    from order_items oi
    where oi.product_id = p_product_id;
    
    v_profit := v_total_revenue - v_total_cost;
    
    raise notice 'Товар: "%" (id: %)', v_product_name, p_product_id;
    raise notice 'Выручка: % руб.', v_total_revenue;
    raise notice 'Себестоимость: % руб.', v_total_cost;
    raise notice 'Прибыль: % руб.', v_profit;
    
exception
    when others then
        raise exception 'Ошибка расчета прибыли: %', sqlerrm;
end;
$$;

call calculate_product_profit(1);

-- 3. Расчет общей суммы покупок пользователя
create or replace procedure calculate_user_total_spent(p_user_id int)
language plpgsql
as $$
declare
    v_user_name varchar(20);
    v_total_spent decimal(15,2);
    v_orders_count int;
    v_avg_order_amount decimal(15,2);
begin
    select first_name into v_user_name
    from users
    where id = p_user_id and not deleted;
    
    if v_user_name is null then
        raise exception 'Пользователь с id % не найден или удален', p_user_id;
    end if;
    
    select 
        coalesce(sum(total_amount), 0),
        count(*)
    into v_total_spent, v_orders_count
    from orders
    where user_id = p_user_id;
    
    if v_orders_count > 0 then
        v_avg_order_amount := v_total_spent / v_orders_count;
    else
        v_avg_order_amount := 0;
    end if;
    
    raise notice 'Пользователь: "%" (id: %)', v_user_name, p_user_id;
    raise notice 'Общая сумма покупок: % руб.', v_total_spent;
    raise notice 'Количество заказов: %', v_orders_count;
    raise notice 'Средний чек: % руб.', v_avg_order_amount;
    
exception
    when others then
        raise exception 'Ошибка расчета суммы покупок: %', sqlerrm;
end;
$$;

call calculate_user_total_spent(11);

-- 4. Изменение статуса заказа
create or replace procedure change_order_status(p_order_id int, p_new_status_id int)
language plpgsql
as $$
declare
    v_order_number varchar(20);
    v_old_status_name varchar(50);
    v_new_status_name varchar(50);
begin
    select order_number into v_order_number
    from orders
    where id = p_order_id;
    
    if v_order_number is null then
        raise exception 'Заказ с id % не найден', p_order_id;
    end if;
    
    select status_name into v_new_status_name
    from status_orders
    where id = p_new_status_id;
    
    if v_new_status_name is null then
        raise exception 'Статус с id % не найден', p_new_status_id;
    end if;
    
    select so.status_name into v_old_status_name
    from orders o
    join status_orders so on o.status_order_id = so.id
    where o.id = p_order_id;
    
    update orders
    set status_order_id = p_new_status_id
    where id = p_order_id;
    
    raise notice 'Статус заказа % (id: %) изменен: "%" -> "%"', 
                 v_order_number, p_order_id, v_old_status_name, v_new_status_name;
    
exception
    when others then
        raise exception 'Ошибка смены статуса: %', sqlerrm;
end;
$$;

call change_order_status(30, 4);

--- RBAC ---

create role admin_role;
create role manager_role;
create role client_role;

create user admin_user with password 'admin_pass';
create user manager_user with password 'manager_pass';
create user client_user with password 'client_pass';

grant admin_role to admin_user;
grant manager_role to manager_user;
grant client_role to client_user;

grant all privileges on all tables in schema public to admin_role;
grant all privileges on all sequences in schema public to admin_role;

grant select, insert, update, delete on users, products, orders to manager_role;
grant usage, select, update on all sequences in schema public to manager_role;

grant select on products, orders to client_role;
grant usage, select on all sequences in schema public to client_role;

alter default privileges in schema public grant all on tables to admin_role;
alter default privileges in schema public grant usage, select, update on sequences to admin_role;

alter default privileges in schema public grant select, insert, update, delete on tables to manager_role;
alter default privileges in schema public grant usage, select, update on sequences to manager_role;

alter default privileges in schema public grant select on tables to client_role;
alter default privileges in schema public grant usage, select on sequences to client_role;

set role admin_user;
select current_user;  

reset role;

set role manager_user;
select current_user;  

reset role;

set role client_user;
select current_user;  
reset role;