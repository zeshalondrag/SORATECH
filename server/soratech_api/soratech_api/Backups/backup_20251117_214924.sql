--
-- PostgreSQL database dump
--

\restrict 0BwpGOQ6epJ8bGPXdNIzsA52W7AzUAXbfhvuOJVIkB7oVeIQNDfxNdcD0C8OLwN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: audit_trigger_func(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.audit_trigger_func() OWNER TO postgres;

--
-- Name: calculate_category_revenue(integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.calculate_category_revenue(IN p_category_id integer)
    LANGUAGE plpgsql
    AS $$
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


ALTER PROCEDURE public.calculate_category_revenue(IN p_category_id integer) OWNER TO postgres;

--
-- Name: calculate_product_profit(integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.calculate_product_profit(IN p_product_id integer)
    LANGUAGE plpgsql
    AS $$
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


ALTER PROCEDURE public.calculate_product_profit(IN p_product_id integer) OWNER TO postgres;

--
-- Name: calculate_user_total_spent(integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.calculate_user_total_spent(IN p_user_id integer)
    LANGUAGE plpgsql
    AS $$
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


ALTER PROCEDURE public.calculate_user_total_spent(IN p_user_id integer) OWNER TO postgres;

--
-- Name: change_order_status(integer, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.change_order_status(IN p_order_id integer, IN p_new_status_id integer)
    LANGUAGE plpgsql
    AS $$
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


ALTER PROCEDURE public.change_order_status(IN p_order_id integer, IN p_new_status_id integer) OWNER TO postgres;

--
-- Name: format_phone(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.format_phone() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.format_phone() OWNER TO postgres;

--
-- Name: generate_guest_nickname(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_guest_nickname() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_guest_nickname() OWNER TO postgres;

--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_order_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
begin
    return '№' || lpad(floor(random() * 100000000)::text, 6, '0');
end;
$$;


ALTER FUNCTION public.generate_order_number() OWNER TO postgres;

--
-- Name: generate_product_article(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_product_article() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_product_article() OWNER TO postgres;

--
-- Name: set_order_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.order_number := generate_order_number();
    while exists (select 1 from orders where order_number = new.order_number) loop
        new.order_number := generate_order_number();
    end loop;
    return new;
end;
$$;


ALTER FUNCTION public.set_order_number() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    user_id integer,
    street character varying(200) NOT NULL,
    city character varying(100) NOT NULL,
    postal_code character varying(6) NOT NULL,
    country character varying(50) DEFAULT 'Россия'::character varying NOT NULL,
    CONSTRAINT addresses_country_check CHECK (((country)::text = 'Россия'::text)),
    CONSTRAINT addresses_postal_code_check CHECK (((postal_code)::text ~ '^\d{6}$'::text))
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addresses_id_seq OWNER TO postgres;

--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    table_name text NOT NULL,
    operation text NOT NULL,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    changed_at timestamp without time zone DEFAULT now(),
    user_id integer
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: cart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart OWNER TO postgres;

--
-- Name: cart_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cart_id_seq OWNER TO postgres;

--
-- Name: cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cart_id_seq OWNED BY public.cart.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name_category character varying(100) NOT NULL,
    description text NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: characteristic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.characteristic (
    id integer NOT NULL,
    name_characteristic character varying(100) NOT NULL,
    description text NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.characteristic OWNER TO postgres;

--
-- Name: characteristic_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.characteristic_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.characteristic_id_seq OWNER TO postgres;

--
-- Name: characteristic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.characteristic_id_seq OWNED BY public.characteristic.id;


--
-- Name: delivery_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_types (
    id integer NOT NULL,
    delivery_type_name character varying(50) NOT NULL,
    description text NOT NULL,
    CONSTRAINT delivery_types_delivery_type_name_check CHECK (((delivery_type_name)::text = ANY ((ARRAY['Курьер'::character varying, 'Самовывоз'::character varying])::text[])))
);


ALTER TABLE public.delivery_types OWNER TO postgres;

--
-- Name: delivery_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_types_id_seq OWNER TO postgres;

--
-- Name: delivery_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_types_id_seq OWNED BY public.delivery_types.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.favorites OWNER TO postgres;

--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.favorites_id_seq OWNER TO postgres;

--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    user_id integer NOT NULL,
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status_order_id integer DEFAULT 1 NOT NULL,
    address_id integer,
    delivery_types_id integer NOT NULL,
    payment_types_id integer NOT NULL,
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payment_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_types (
    id integer NOT NULL,
    payment_type_name character varying(50) NOT NULL,
    description text NOT NULL,
    CONSTRAINT payment_types_payment_type_name_check CHECK (((payment_type_name)::text = ANY ((ARRAY['Наличные'::character varying, 'Карта'::character varying])::text[])))
);


ALTER TABLE public.payment_types OWNER TO postgres;

--
-- Name: status_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status_orders (
    id integer NOT NULL,
    status_name character varying(50) NOT NULL,
    CONSTRAINT status_orders_status_name_check CHECK (((status_name)::text = ANY ((ARRAY['Ожидает оплаты'::character varying, 'Оплачен'::character varying, 'Отправлен'::character varying, 'Доставлен'::character varying, 'Отменён'::character varying])::text[])))
);


ALTER TABLE public.status_orders OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    role_id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(20) NOT NULL,
    nickname character varying(20) NOT NULL,
    phone character varying(20) NOT NULL,
    registration_date date DEFAULT CURRENT_DATE NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    is_dark_theme boolean DEFAULT false NOT NULL,
    currency character varying(3) DEFAULT 'RUB'::character varying NOT NULL,
    CONSTRAINT users_currency_check CHECK (((currency)::text = ANY ((ARRAY['RUB'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT users_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_phone_check CHECK (((phone)::text ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'::text))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: order_analytics_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.order_analytics_view AS
 SELECT o.id AS "ID",
    u.first_name AS "Клиент",
    o.order_date AS "Дата заказа",
    o.total_amount AS "Сумма заказа",
    s.status_name AS "Статус",
    d.delivery_type_name AS "Тип доставки",
    p.payment_type_name AS "Тип оплаты",
    (((a.street)::text || ', '::text) || (a.city)::text) AS "Адрес"
   FROM (((((public.orders o
     JOIN public.users u ON ((o.user_id = u.id)))
     JOIN public.status_orders s ON ((o.status_order_id = s.id)))
     LEFT JOIN public.addresses a ON ((o.address_id = a.id)))
     JOIN public.delivery_types d ON ((o.delivery_types_id = d.id)))
     JOIN public.payment_types p ON ((o.payment_types_id = p.id)))
  ORDER BY o.order_date DESC;


ALTER VIEW public.order_analytics_view OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price > (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name_product character varying(200) NOT NULL,
    article character varying(6) NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    stock_quantity integer DEFAULT 0,
    category_id integer NOT NULL,
    supplier_id integer NOT NULL,
    image_url text,
    sales_count integer DEFAULT 0 NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT products_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT products_sales_count_check CHECK ((sales_count >= 0)),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: order_full_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.order_full_view AS
 SELECT o.id,
    o.order_number,
    o.order_date,
    u.first_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    so.status_name AS order_status,
    string_agg(((((p.name_product)::text || ' (x'::text) || oi.quantity) || ')'::text), ', '::text ORDER BY p.name_product) AS products,
    sum((oi.unit_price * (oi.quantity)::numeric)) AS total_amount
   FROM ((((public.orders o
     JOIN public.users u ON ((o.user_id = u.id)))
     JOIN public.status_orders so ON ((o.status_order_id = so.id)))
     JOIN public.order_items oi ON ((o.id = oi.order_id)))
     JOIN public.products p ON ((oi.product_id = p.id)))
  GROUP BY o.id, o.order_number, o.order_date, u.first_name, u.email, u.phone, so.status_name;


ALTER VIEW public.order_full_view OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_types_id_seq OWNER TO postgres;

--
-- Name: payment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_types_id_seq OWNED BY public.payment_types.id;


--
-- Name: product_analytics_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.product_analytics_view AS
SELECT
    NULL::integer AS "ID",
    NULL::character varying(6) AS "Артикул",
    NULL::character varying(200) AS "Название товара",
    NULL::numeric(10,2) AS "Цена",
    NULL::integer AS "Остаток",
    NULL::bigint AS "Продано единиц",
    NULL::numeric AS "Выручка",
    NULL::character varying(100) AS "Категория",
    NULL::character varying(150) AS "Поставщик";


ALTER VIEW public.product_analytics_view OWNER TO postgres;

--
-- Name: product_characteristic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_characteristic (
    id integer NOT NULL,
    product_id integer NOT NULL,
    characteristic_id integer NOT NULL,
    description text NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.product_characteristic OWNER TO postgres;

--
-- Name: product_characteristic_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_characteristic_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_characteristic_id_seq OWNER TO postgres;

--
-- Name: product_characteristic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_characteristic_id_seq OWNED BY public.product_characteristic.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name_supplier character varying(150) NOT NULL,
    contact_email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT suppliers_contact_email_check CHECK (((contact_email)::text ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT suppliers_phone_check CHECK (((phone)::text ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'::text))
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: product_full_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.product_full_view AS
 SELECT p.id,
    p.article,
    p.name_product,
    p.description,
    p.price,
    p.stock_quantity,
    s.name_supplier,
    string_agg((c.name_category)::text, ', '::text) AS categories,
    COALESCE(string_agg((((ch.name_characteristic)::text || ': '::text) || pc.description), ', '::text ORDER BY ch.name_characteristic), 'Нет характеристик'::text) AS characteristics
   FROM ((((public.products p
     LEFT JOIN public.suppliers s ON ((p.supplier_id = s.id)))
     LEFT JOIN public.categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.product_characteristic pc ON ((p.id = pc.product_id)))
     LEFT JOIN public.characteristic ch ON ((pc.characteristic_id = ch.id)))
  GROUP BY p.id, p.article, p.name_product, p.description, p.price, p.stock_quantity, s.name_supplier;


ALTER VIEW public.product_full_view OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: review_analytics_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.review_analytics_view AS
SELECT
    NULL::integer AS "ID",
    NULL::character varying(6) AS "Артикул",
    NULL::character varying(200) AS "Название товара",
    NULL::numeric AS "Средний рейтинг",
    NULL::bigint AS "Количество отзывов",
    NULL::text AS "Комментарии";


ALTER VIEW public.review_analytics_view OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    product_id integer NOT NULL,
    user_id integer NOT NULL,
    rating numeric(2,1) NOT NULL,
    comment_text text,
    review_date date DEFAULT CURRENT_DATE NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= (1)::numeric) AND (rating <= (5)::numeric)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: status_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.status_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.status_orders_id_seq OWNER TO postgres;

--
-- Name: status_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.status_orders_id_seq OWNED BY public.status_orders.id;


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: cart id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart ALTER COLUMN id SET DEFAULT nextval('public.cart_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: characteristic id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.characteristic ALTER COLUMN id SET DEFAULT nextval('public.characteristic_id_seq'::regclass);


--
-- Name: delivery_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_types ALTER COLUMN id SET DEFAULT nextval('public.delivery_types_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_types ALTER COLUMN id SET DEFAULT nextval('public.payment_types_id_seq'::regclass);


--
-- Name: product_characteristic id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_characteristic ALTER COLUMN id SET DEFAULT nextval('public.product_characteristic_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: status_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_orders ALTER COLUMN id SET DEFAULT nextval('public.status_orders_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (id, user_id, street, city, postal_code, country) FROM stdin;
3	11	ул.Тестовая. д.3	Москва	123456	Россия
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, table_name, operation, record_id, old_data, new_data, changed_at, user_id) FROM stdin;
285	products	UPDATE	1	{"id": 1, "price": 33440.00, "article": "498453", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png", "category_id": 1, "description": "Процессор AMD Ryzen 7 7800X3D OEM - это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями.\\n\\nЭтот процессор принадлежит линейке Ryzen 7 и имеет модель 7800X3D. Он оснащен сокетом AM5 и архитектурой Zen 4, что обеспечивает высокую эффективность работы и отличное энергосбережение. Ядро процессора называется Raphael, а количество ядер составляет 8, что позволяет выполнять множество задач одновременно. Количество потоков - 16, что делает процессор идеальным выбором для многозадачных операций.\\n\\nОбъем кэша L1 составляет 512 Кб, кэша L2 - 8 Мб и кэша L3 - 96 Мб, что обеспечивает быстрый доступ к данным и значительно повышает производительность устройства. Встроенный видеопроцессор Radeon Graphics обеспечивает высокое качество графики и плавную работу при запуске игр и мультимедийных приложений.\\n\\nТехнологический процесс процессора AMD Ryzen 7 7800X3D OEM составляет 5 нм, что гарантирует высокую эффективность и низкое энергопотребление устройства. Тип поставки - OEM, что означает, что процессор поставляется без дополнительных аксессуаров и упаковки, но с полной гарантией производителя.\\n\\nБлагодаря высокой производительности, низкому энергопотреблению и отличным игровым возможностям, процессор AMD Ryzen 7 7800X3D OEM станет отличным выбором для тех, кто ценит качество и эффективность работы своего компьютера. Позвольте себе насладиться быстрой и плавной работой устройства с этим мощным процессором от AMD.", "sales_count": 4, "supplier_id": 1, "name_product": "Процессор AMD Ryzen 7 7800X3D OEM", "stock_quantity": 24}	{"id": 1, "price": 33440.00, "article": "498453", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png", "category_id": 1, "description": "Процессор AMD Ryzen 7 7800X3D OEM - это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями.\\n\\nЭтот процессор принадлежит линейке Ryzen 7 и имеет модель 7800X3D. Он оснащен сокетом AM5 и архитектурой Zen 4, что обеспечивает высокую эффективность работы и отличное энергосбережение. Ядро процессора называется Raphael, а количество ядер составляет 8, что позволяет выполнять множество задач одновременно. Количество потоков - 16, что делает процессор идеальным выбором для многозадачных операций.\\n\\nОбъем кэша L1 составляет 512 Кб, кэша L2 - 8 Мб и кэша L3 - 96 Мб, что обеспечивает быстрый доступ к данным и значительно повышает производительность устройства. Встроенный видеопроцессор Radeon Graphics обеспечивает высокое качество графики и плавную работу при запуске игр и мультимедийных приложений.\\n\\nТехнологический процесс процессора AMD Ryzen 7 7800X3D OEM составляет 5 нм, что гарантирует высокую эффективность и низкое энергопотребление устройства. Тип поставки - OEM, что означает, что процессор поставляется без дополнительных аксессуаров и упаковки, но с полной гарантией производителя.\\n\\nБлагодаря высокой производительности, низкому энергопотреблению и отличным игровым возможностям, процессор AMD Ryzen 7 7800X3D OEM станет отличным выбором для тех, кто ценит качество и эффективность работы своего компьютера. Позвольте себе насладиться быстрой и плавной работой устройства с этим мощным процессором от AMD.", "sales_count": 103, "supplier_id": 1, "name_product": "Процессор AMD Ryzen 7 7800X3D OEM", "stock_quantity": 24}	2025-11-16 01:06:39.922051	11
286	products	UPDATE	2	{"id": 2, "price": 136530.00, "article": "490788", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png", "category_id": 2, "description": "Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.\\n\\nЭта видеокарта оснащена интерфейсом PCI Express 5.0, что обеспечивает высокую скорость передачи данных и позволяет получить максимальную производительность в играх. Производитель видеопроцессора - NVIDIA, а серия - GeForce RTX 5080, что гарантирует высочайшее качество графики и отличную оптимизацию игр.\\n\\nАрхитектура графического процессора NVIDIA Blackwell в сочетании с 4-нм техпроцессом и объемом памяти 16 Гб типа GDDR7 обеспечивает плавную работу даже в самых требовательных играх. Шина памяти 256 бит гарантирует высокую скорость обработки данных, а количество занимаемых слотов - 3.5, позволяет установить данную видеокарту в большинство современных корпусов.\\n\\nСистема охлаждения активная с тремя вентиляторами позволяет держать температуру видеокарты на оптимальном уровне, что обеспечивает стабильную работу и высокую производительность даже при длительных игровых сессиях. Количество поддерживаемых мониторов - 4, а максимальное разрешение - 7680x4320, что позволяет наслаждаться играми в потрясающем качестве.\\n\\nДля подключения видеокарты к системному блоку предусмотрен разъем дополнительного питания 16 pin, что обеспечивает стабильное энергоснабжение и предотвращает сбои в работе. Тип поставки - Retail, что гарантирует официальную гарантию и качество товара.\\n\\nЕсли вы ищете мощную и качественную видеокарту для игр или профессиональной работы, то NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) станет надежным решением для вас. Получите максимальное удовольствие от игрового процесса и наслаждайтесь потрясающей графикой с этой видеокартой!", "sales_count": 5, "supplier_id": 2, "name_product": "Видеокарта NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)", "stock_quantity": 50}	{"id": 2, "price": 136530.00, "article": "490788", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png", "category_id": 2, "description": "Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.\\n\\nЭта видеокарта оснащена интерфейсом PCI Express 5.0, что обеспечивает высокую скорость передачи данных и позволяет получить максимальную производительность в играх. Производитель видеопроцессора - NVIDIA, а серия - GeForce RTX 5080, что гарантирует высочайшее качество графики и отличную оптимизацию игр.\\n\\nАрхитектура графического процессора NVIDIA Blackwell в сочетании с 4-нм техпроцессом и объемом памяти 16 Гб типа GDDR7 обеспечивает плавную работу даже в самых требовательных играх. Шина памяти 256 бит гарантирует высокую скорость обработки данных, а количество занимаемых слотов - 3.5, позволяет установить данную видеокарту в большинство современных корпусов.\\n\\nСистема охлаждения активная с тремя вентиляторами позволяет держать температуру видеокарты на оптимальном уровне, что обеспечивает стабильную работу и высокую производительность даже при длительных игровых сессиях. Количество поддерживаемых мониторов - 4, а максимальное разрешение - 7680x4320, что позволяет наслаждаться играми в потрясающем качестве.\\n\\nДля подключения видеокарты к системному блоку предусмотрен разъем дополнительного питания 16 pin, что обеспечивает стабильное энергоснабжение и предотвращает сбои в работе. Тип поставки - Retail, что гарантирует официальную гарантию и качество товара.\\n\\nЕсли вы ищете мощную и качественную видеокарту для игр или профессиональной работы, то NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) станет надежным решением для вас. Получите максимальное удовольствие от игрового процесса и наслаждайтесь потрясающей графикой с этой видеокартой!", "sales_count": 78, "supplier_id": 2, "name_product": "Видеокарта NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)", "stock_quantity": 50}	2025-11-16 01:07:02.624571	11
287	products	UPDATE	5	{"id": 5, "price": 13100.00, "article": "716099", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/SSD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/SSD%201Tb%20Samsung%20990%20PRO%20(MZ-V9P1T0BW).png", "category_id": 5, "description": "Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) - это ультрасовременное решение для хранения данных, которое обеспечивает высокую скорость работы и надежность. Этот накопитель предназначен для установки внутри компьютера и отличается превосходными техническими характеристиками.\\n\\nТип SSD гарантирует быструю передачу данных и максимальную производительность. Форм-фактор M.2 позволяет установить накопитель без лишних проводов и кабелей, что сделает вашу систему более компактной и эстетичной. Тип флэш-памяти TLC обеспечивает надежность и долговечность накопителя, а объем кэш-памяти 1024 Мб позволяет ускорить процессы чтения и записи данных.\\n\\nОсновные преимущества накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW):\\n- Высокая скорость работы. SSD-накопитель обеспечивает быструю загрузку операционной системы, запуск приложений и передачу файлов.\\n- Надежность. Тип флэш-памяти TLC обеспечивает долгий срок службы накопителя и защиту данных от потери.\\n- Превосходная производительность. Накопитель Samsung 990 PRO обладает высокой скоростью чтения и записи данных, что делает его идеальным выбором для профессионалов и геймеров.\\n- Простота установки. Форм-фактор M.2 позволяет установить накопитель без лиопытных манипуляций.\\n\\nНакопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) подойдет для использования в качестве системного диска, для хранения медиа-контента или как дополнительное хранилище данных. Благодаря высокой скорости работы и надежности, он станет надежным компаньоном в вашей работе и развлечениях.\\n\\nНе упустите возможность обновить вашу систему с помощью накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) и наслаждаться быстрой и стабильной работой вашего компьютера.", "sales_count": 2, "supplier_id": 5, "name_product": "Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW)", "stock_quantity": 14}	{"id": 5, "price": 13100.00, "article": "716099", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/SSD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/SSD%201Tb%20Samsung%20990%20PRO%20(MZ-V9P1T0BW).png", "category_id": 5, "description": "Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) - это ультрасовременное решение для хранения данных, которое обеспечивает высокую скорость работы и надежность. Этот накопитель предназначен для установки внутри компьютера и отличается превосходными техническими характеристиками.\\n\\nТип SSD гарантирует быструю передачу данных и максимальную производительность. Форм-фактор M.2 позволяет установить накопитель без лишних проводов и кабелей, что сделает вашу систему более компактной и эстетичной. Тип флэш-памяти TLC обеспечивает надежность и долговечность накопителя, а объем кэш-памяти 1024 Мб позволяет ускорить процессы чтения и записи данных.\\n\\nОсновные преимущества накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW):\\n- Высокая скорость работы. SSD-накопитель обеспечивает быструю загрузку операционной системы, запуск приложений и передачу файлов.\\n- Надежность. Тип флэш-памяти TLC обеспечивает долгий срок службы накопителя и защиту данных от потери.\\n- Превосходная производительность. Накопитель Samsung 990 PRO обладает высокой скоростью чтения и записи данных, что делает его идеальным выбором для профессионалов и геймеров.\\n- Простота установки. Форм-фактор M.2 позволяет установить накопитель без лиопытных манипуляций.\\n\\nНакопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) подойдет для использования в качестве системного диска, для хранения медиа-контента или как дополнительное хранилище данных. Благодаря высокой скорости работы и надежности, он станет надежным компаньоном в вашей работе и развлечениях.\\n\\nНе упустите возможность обновить вашу систему с помощью накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) и наслаждаться быстрой и стабильной работой вашего компьютера.", "sales_count": 34, "supplier_id": 5, "name_product": "Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW)", "stock_quantity": 14}	2025-11-16 01:09:58.867784	11
288	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	2025-11-17 10:12:39.102667	11
284	products	UPDATE	2	{"id": 2, "price": 136530.00, "article": "490788", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png", "category_id": 2, "description": "Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.\\n\\nЭта видеокарта оснащена интерфейсом PCI Express 5.0, что обеспечивает высокую скорость передачи данных и позволяет получить максимальную производительность в играх. Производитель видеопроцессора - NVIDIA, а серия - GeForce RTX 5080, что гарантирует высочайшее качество графики и отличную оптимизацию игр.\\n\\nАрхитектура графического процессора NVIDIA Blackwell в сочетании с 4-нм техпроцессом и объемом памяти 16 Гб типа GDDR7 обеспечивает плавную работу даже в самых требовательных играх. Шина памяти 256 бит гарантирует высокую скорость обработки данных, а количество занимаемых слотов - 3.5, позволяет установить данную видеокарту в большинство современных корпусов.\\n\\nСистема охлаждения активная с тремя вентиляторами позволяет держать температуру видеокарты на оптимальном уровне, что обеспечивает стабильную работу и высокую производительность даже при длительных игровых сессиях. Количество поддерживаемых мониторов - 4, а максимальное разрешение - 7680x4320, что позволяет наслаждаться играми в потрясающем качестве.\\n\\nДля подключения видеокарты к системному блоку предусмотрен разъем дополнительного питания 16 pin, что обеспечивает стабильное энергоснабжение и предотвращает сбои в работе. Тип поставки - Retail, что гарантирует официальную гарантию и качество товара.\\n\\nЕсли вы ищете мощную и качественную видеокарту для игр или профессиональной работы, то NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) станет надежным решением для вас. Получите максимальное удовольствие от игрового процесса и наслаждайтесь потрясающей графикой с этой видеокартой!", "sales_count": 5, "supplier_id": 2, "name_product": "Видеокарта NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)", "stock_quantity": 3}	{"id": 2, "price": 136530.00, "article": "490788", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png", "category_id": 2, "description": "Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.\\n\\nЭта видеокарта оснащена интерфейсом PCI Express 5.0, что обеспечивает высокую скорость передачи данных и позволяет получить максимальную производительность в играх. Производитель видеопроцессора - NVIDIA, а серия - GeForce RTX 5080, что гарантирует высочайшее качество графики и отличную оптимизацию игр.\\n\\nАрхитектура графического процессора NVIDIA Blackwell в сочетании с 4-нм техпроцессом и объемом памяти 16 Гб типа GDDR7 обеспечивает плавную работу даже в самых требовательных играх. Шина памяти 256 бит гарантирует высокую скорость обработки данных, а количество занимаемых слотов - 3.5, позволяет установить данную видеокарту в большинство современных корпусов.\\n\\nСистема охлаждения активная с тремя вентиляторами позволяет держать температуру видеокарты на оптимальном уровне, что обеспечивает стабильную работу и высокую производительность даже при длительных игровых сессиях. Количество поддерживаемых мониторов - 4, а максимальное разрешение - 7680x4320, что позволяет наслаждаться играми в потрясающем качестве.\\n\\nДля подключения видеокарты к системному блоку предусмотрен разъем дополнительного питания 16 pin, что обеспечивает стабильное энергоснабжение и предотвращает сбои в работе. Тип поставки - Retail, что гарантирует официальную гарантию и качество товара.\\n\\nЕсли вы ищете мощную и качественную видеокарту для игр или профессиональной работы, то NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) станет надежным решением для вас. Получите максимальное удовольствие от игрового процесса и наслаждайтесь потрясающей графикой с этой видеокартой!", "sales_count": 5, "supplier_id": 2, "name_product": "Видеокарта NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)", "stock_quantity": 50}	2025-11-16 01:05:16.995976	11
289	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	2025-11-17 10:13:43.849894	11
290	categories	INSERT	12	\N	{"id": 12, "deleted": false, "description": "asd", "name_category": "asd"}	2025-11-17 11:13:24.775462	11
291	categories	UPDATE	12	{"id": 12, "deleted": false, "description": "asd", "name_category": "asd"}	{"id": 12, "deleted": true, "description": "asd", "name_category": "asd"}	2025-11-17 11:13:38.075004	11
292	categories	UPDATE	12	{"id": 12, "deleted": true, "description": "asd", "name_category": "asd"}	{"id": 12, "deleted": false, "description": "asd", "name_category": "asd"}	2025-11-17 11:13:52.984368	11
293	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	2025-11-17 15:51:03.054498	11
294	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	2025-11-17 15:51:03.418003	11
295	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$oj.mn7nzf/aLseSQzmsIlOUOn3G/W2We1sRWB/6DeMKgJr5i2KvXK", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 15:54:06.979699	\N
296	reviews	UPDATE	3	{"id": 3, "rating": 5.0, "deleted": false, "user_id": 11, "product_id": 1, "review_date": "2025-11-15", "comment_text": "У самого лучшего процессора самый лучший отзыв"}	{"id": 3, "rating": 5.0, "deleted": true, "user_id": 11, "product_id": 1, "review_date": "2025-11-15", "comment_text": "У самого лучшего процессора самый лучший отзыв"}	2025-11-17 15:55:08.107733	11
297	categories	INSERT	13	\N	{"id": 13, "deleted": false, "description": "asd", "name_category": "sad"}	2025-11-17 15:56:49.383416	11
298	categories	UPDATE	12	{"id": 12, "deleted": false, "description": "asd", "name_category": "asd"}	{"id": 12, "deleted": false, "description": "asd", "name_category": "asdasd"}	2025-11-17 15:56:54.807925	11
299	categories	UPDATE	12	{"id": 12, "deleted": false, "description": "asd", "name_category": "asdasd"}	{"id": 12, "deleted": true, "description": "asd", "name_category": "asdasd"}	2025-11-17 15:57:05.73041	11
300	categories	UPDATE	12	{"id": 12, "deleted": true, "description": "asd", "name_category": "asdasd"}	{"id": 12, "deleted": false, "description": "asd", "name_category": "asdasd"}	2025-11-17 15:57:09.226479	11
301	categories	DELETE	12	{"id": 12, "deleted": false, "description": "asd", "name_category": "asdasd"}	\N	2025-11-17 15:57:15.163834	11
302	users	UPDATE	12	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	2025-11-17 15:59:24.232037	12
303	orders	INSERT	31	\N	{"id": 31, "user_id": 12, "address_id": null, "order_date": "2025-11-17T13:03:13", "order_number": "№763365", "total_amount": 34108.80, "status_order_id": 1, "payment_types_id": 2, "delivery_types_id": 2}	2025-11-17 16:03:13.404346	12
304	products	UPDATE	1	{"id": 1, "price": 33440.00, "article": "498453", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png", "category_id": 1, "description": "Процессор AMD Ryzen 7 7800X3D OEM - это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями.\\n\\nЭтот процессор принадлежит линейке Ryzen 7 и имеет модель 7800X3D. Он оснащен сокетом AM5 и архитектурой Zen 4, что обеспечивает высокую эффективность работы и отличное энергосбережение. Ядро процессора называется Raphael, а количество ядер составляет 8, что позволяет выполнять множество задач одновременно. Количество потоков - 16, что делает процессор идеальным выбором для многозадачных операций.\\n\\nОбъем кэша L1 составляет 512 Кб, кэша L2 - 8 Мб и кэша L3 - 96 Мб, что обеспечивает быстрый доступ к данным и значительно повышает производительность устройства. Встроенный видеопроцессор Radeon Graphics обеспечивает высокое качество графики и плавную работу при запуске игр и мультимедийных приложений.\\n\\nТехнологический процесс процессора AMD Ryzen 7 7800X3D OEM составляет 5 нм, что гарантирует высокую эффективность и низкое энергопотребление устройства. Тип поставки - OEM, что означает, что процессор поставляется без дополнительных аксессуаров и упаковки, но с полной гарантией производителя.\\n\\nБлагодаря высокой производительности, низкому энергопотреблению и отличным игровым возможностям, процессор AMD Ryzen 7 7800X3D OEM станет отличным выбором для тех, кто ценит качество и эффективность работы своего компьютера. Позвольте себе насладиться быстрой и плавной работой устройства с этим мощным процессором от AMD.", "sales_count": 103, "supplier_id": 1, "name_product": "Процессор AMD Ryzen 7 7800X3D OEM", "stock_quantity": 24}	{"id": 1, "price": 33440.00, "article": "498453", "deleted": false, "image_url": "https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png", "category_id": 1, "description": "Процессор AMD Ryzen 7 7800X3D OEM - это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями.\\n\\nЭтот процессор принадлежит линейке Ryzen 7 и имеет модель 7800X3D. Он оснащен сокетом AM5 и архитектурой Zen 4, что обеспечивает высокую эффективность работы и отличное энергосбережение. Ядро процессора называется Raphael, а количество ядер составляет 8, что позволяет выполнять множество задач одновременно. Количество потоков - 16, что делает процессор идеальным выбором для многозадачных операций.\\n\\nОбъем кэша L1 составляет 512 Кб, кэша L2 - 8 Мб и кэша L3 - 96 Мб, что обеспечивает быстрый доступ к данным и значительно повышает производительность устройства. Встроенный видеопроцессор Radeon Graphics обеспечивает высокое качество графики и плавную работу при запуске игр и мультимедийных приложений.\\n\\nТехнологический процесс процессора AMD Ryzen 7 7800X3D OEM составляет 5 нм, что гарантирует высокую эффективность и низкое энергопотребление устройства. Тип поставки - OEM, что означает, что процессор поставляется без дополнительных аксессуаров и упаковки, но с полной гарантией производителя.\\n\\nБлагодаря высокой производительности, низкому энергопотреблению и отличным игровым возможностям, процессор AMD Ryzen 7 7800X3D OEM станет отличным выбором для тех, кто ценит качество и эффективность работы своего компьютера. Позвольте себе насладиться быстрой и плавной работой устройства с этим мощным процессором от AMD.", "sales_count": 104, "supplier_id": 1, "name_product": "Процессор AMD Ryzen 7 7800X3D OEM", "stock_quantity": 23}	2025-11-17 16:03:13.404346	12
305	order_items	INSERT	32	\N	{"id": 32, "order_id": 31, "quantity": 1, "product_id": 1, "unit_price": 33440.00}	2025-11-17 16:03:13.404346	12
306	users	UPDATE	12	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	2025-11-17 16:18:53.161139	\N
307	users	UPDATE	12	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	{"id": 12, "email": "yaneytm12.11.20@gmail.com", "phone": "+7 (800) 555-35-35", "deleted": false, "role_id": 2, "nickname": "YANEY", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16", "registration_date": "2025-11-15"}	2025-11-17 16:19:10.981172	12
308	orders	UPDATE	30	{"id": 30, "user_id": 12, "address_id": null, "order_date": "2025-11-15T12:24:44", "order_number": "№403434", "total_amount": 9180.00, "status_order_id": 1, "payment_types_id": 1, "delivery_types_id": 2}	{"id": 30, "user_id": 12, "address_id": null, "order_date": "2025-11-15T12:24:44", "order_number": "№403434", "total_amount": 9180.00, "status_order_id": 4, "payment_types_id": 1, "delivery_types_id": 2}	2025-11-17 19:45:42.547554	\N
309	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "RUB", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "RUB", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 21:04:32.01959	11
310	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "RUB", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "USD", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 21:04:47.383171	11
311	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "USD", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": false, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "USD", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 21:13:50.833865	11
312	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "USD", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "RUB", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 21:14:26.064469	11
313	users	UPDATE	11	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "RUB", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	{"id": 11, "email": "sanyayt1337@gmail.com", "phone": "+7 (929) 933-94-10", "deleted": false, "role_id": 1, "currency": "USD", "nickname": "zeshalondrag", "first_name": "Александр", "is_dark_theme": true, "password_hash": "$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG", "registration_date": "2025-11-13"}	2025-11-17 21:14:45.007168	11
\.


--
-- Data for Name: cart; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart (id, user_id, product_id, quantity, added_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name_category, description, deleted) FROM stdin;
2	Видеокарта	Графические ускорители (GPU) для обработки визуальной информации, игр, рендеринга и машинного обучения.	f
3	Материнская плата	Основная плата, объединяющая все компоненты ПК и обеспечивающая взаимодействие между ними.	f
4	Оперативная память	Модули RAM, обеспечивающие временное хранение данных и ускорение вычислений.	f
5	Накопители SSD	Твердотельные накопители, обеспечивающие высокую скорость чтения и записи данных.	f
6	Жёсткие диски (HDD)	Магнитные накопители для долговременного хранения больших объёмов данных.	f
7	Система охлаждения	Кулеры, радиаторы и СЖО для охлаждения процессора, видеокарты и других компонентов.	f
8	Блок питания	Источник питания (PSU), обеспечивающий стабильное электропитание всех компонентов ПК.	f
9	Корпуса	Корпуса для сборки компьютеров различных форм-факторов с возможностью установки систем охлаждения и кабель-менеджмента.	f
1	Процессоры	Центральные процессоры (CPU) для настольных ПК и рабочих станций, определяющие производительность системы.	f
13	sad	asd	f
\.


--
-- Data for Name: characteristic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.characteristic (id, name_characteristic, description, deleted) FROM stdin;
1	Socket	Socket - разъём на материнской плате для установки процессора. Обычно характеризуется количеством контактов в зависимости от линейки процессора и производителя. Каждая модель процессора совместима с определённым сокетом. Актуальные на сегодня сокеты процессоров: Intel – 1200, 1700, 2066; AMD – AM4, AM5, sTRX4, sWRX8.	f
2	Количество ядер	Число ядер в процессоре. Количество ядер влияет на производительность процессора при одновременном выполнении задач.	f
3	Тактовая частота	Тактовая частота - это количество тактов процессора в секунду, то есть количество выполняемых операций в секунду. Один из параметров характеризующих производительность.	f
4	Частота процессора в режиме Turbo	Режим Turbo - это автоматическое увеличение тактовой частоты в зависимости от нагрузки на процессор. Позволяет временно повышать производительность системы, когда стандартных средств процессора при текущих задачах недостаточно.	f
5	Ядро	Название архитектуры, на которой построены ядра процессора. Ядро - главная часть процессора. Именно в ядре проводятся все операции, выполняемые процессором. По ядру определяют рабочую частоту процессора и набор выполняемых им команд.	f
6	Объём кэша L2	Объём кэш-памяти второго уровня. Это блок высокоскоростной памяти, позволяющий повысить производительность процессора за счёт более высокой скорости обработки данных. Кэш-память L2 имеет более низкую скорость и больший объём по сравнению с кэшем L1. Для выполнения ресурсоёмких задач предпочтительнее процессор с большим объёмом кэша L2. Указывается суммарный объём кэш-памяти второго уровня.	f
7	Объём кэша L3	Объём кэш-памяти третьего уровня. Кэш-память L3 отличается более низкой скоростью (но всё ещё быстрее оперативной памяти) и большим объёмом по сравнению с кэшем первого и второго уровня. Указывается суммарный объём кэш-памяти третьего уровня.	f
8	Видеопроцессор	Наименование встроенного в процессор графического ускорителя.	f
9	Технологический процесс	Техпроцесс - это разрешающая способность оборудования на котором производили полупроводниковые элементы, составляющие основу внутренних цепей процессора. Совершенствование технологии и уменьшение размеров полупроводников способствуют снижению рабочей температуры и повышению производительности процессора.	f
10	Типичное тепловыделение	Типичное тепловыделение (TDP) - усреднённая величина, указывающая, на отвод какой тепловой мощности должна быть рассчитана система охлаждения процессора при повседневных задачах.	f
11	Форм-фактор	Стандарт, определяющий габаритные размеры, монтажные отверстия, разъёмы питания и максимальное количество слотов расширения материнской платы. При выборе материнской платы нужно учитывать максимально поддерживаемый вашим корпусом форм-фактор. Стоит отметить, что материнские платы меньшего форм-фактора совместимы с корпусами большего. Другими словами в корпус E-ATX (один из самых больших) можно устанавливать материнские платы (перечислены в порядке уменьшения габаритных размеров) E-ATX, ATX, mATX, mini-ITX.	f
13	Чипсет	Чипсет — набор микросхем на материнской плате. Является связующим компонентом, обеспечивающим совместную работу процессора, подсистем памяти, интерфейсов ввода-вывода (USB, аудио, сеть) и других. Чипсет во многом определяет функционал материнской платы: поддержку процессоров, количество USB интерфейсов, каналов SATA, линий PCI-E и т.д. Наиболее актуальными чипсетами на сегодняшний день являются: Intel – H510, B560, H570, Z590, H610, B660, H670, Z690, B760, H770, Z790, X299; AMD – A320, B450, X470, A520, B550, X570, TRX40, WRX80.	f
17	Сетевой интерфейс	Тип интегрированного в материнскую плату сетевого интерфейса. На сегодняшний день все материнские платы оснащаются как минимум сетевым интерфейсом стандарта Gigabit Ethernet (100/1000 Мбит/с, проводное подключение), реже используется сетевой интерфейс стандарта (2500/5000/10000 Мбит/с). Также можно встретить материнские платы, оснащённые беспроводными интерфейсами Wi-Fi/Bluetooth/NFC, что может быть удобно при организации беспроводной сети.	f
14	Количество слотов памяти	Число слотов для оперативной памяти, установленных на материнской плате. Показывает, сколько модулей памяти можно установить на материнскую плату. Наличие свободных слотов бывает полезно при модернизации системы. В свободные слоты ставятся новые модули, при этом старые модули остаются на своих местах. Также свободные слоты нужны для работы памяти в многоканальных режимах: для двухканального нужно минимум 2 слота, для трёхканального - минимум 3, для четырёхканального - минимум 4. На материнских платах для персональных компьютеров, как правило, устанавливается от 2 до 8 слотов под память.	f
15	Тип памяти	Тип памяти, поддерживаемый материнской платой. На сегодняшний день наиболее актуальной памятью является DDR4. Всё более широкое применение получает память DDR5. Нужно учитывать, что под каждый тип памяти предназначен определённый разъём, то есть, нельзя установить память DDR4 в разъём DDR5.	f
16	Слоты расширения	Тип установленных на плате слотов расширения. Они предназначены для установки дополнительных плат расширения (звуковые и сетевые карты, ТВ-тюнеры, твердотельные накопители, различные контроллеры и т.д.). На сегодняшний день наиболее актуальными слотами расширения являются PCI-E (PCI-Express). Ширина пропускания PCI-E масштабируется за счёт добавления каналов с данными, при этом получаются соответствующие модификации шины (PCI-E x1, x4, x8, x16). Интерфейсы M.2 и Mini PCI-E являются компактной альтернативой полноценным слотам, и на материнских платах, как правило, совмещены с интерфейсом SATA для подключения твердотельных накопителей.	f
18	Разъёмы на задней панели	Интерфейсные разъёмы на задней панели материнской платы. На материнской плате, в зависимости от уровня её оснащённости, может присутствовать масса различных интерфейсов для подключения периферии. Помимо стандартных разъёмов для подключения мыши, клавиатуры, колонок или наушников, сетевого кабеля, портов USB и COM/LPT, на задней панели могут присутствовать разъёмы для подключения различных периферийных устройств с различными интерфейсами. VGA, DVI, HDMI, DisplayPort - для подключения мониторов, телевизоров и проекторов. Thunderbolt - для подключения внешних устройств (мониторов, видеокарт, систем хранения, док-станций). S/PDIF (оптический) - для подключения звуковых ресиверов и прочих подобных устройств по цифровому интерфейсу.	f
19	Интерфейс	Тип разъёма, в который устанавливается видеокарта. Через него происходит обмен данными между видеокартой и материнской платой. На сегодняшний день наиболее актуальным является разъём PCI-E 4.0. Все разъёмы PCI-E обратно совместимы. То есть видеокарта PCI-E 1.0 будет работать в разъёме 4.0. И наоборот.	f
20	Частота графического процессора	Частота графического процессора во многом влияет на производительность видеоподсистемы, но не всегда является определяющим фактором. Стоит учитывать, что чем выше частота графического процессора, тем больше его тепловыделение. Соответственно, ему нужно более серьёзное охлаждение.	f
21	Частота графического процессора (Boost)	Частота, которую может достигать графический процессор при повышенной нагрузке.	f
22	Объём памяти	Объём оперативной памяти, установленной на видеокарте. В видеопамяти хранятся элементы изображения, необходимые для его вывода на экран. В современных видеокартах объём видеопамяти может составлять от 2 до 48 Гб. В настоящий момент для актуальных 3D игр в среднем требуется видеокарта с 6-8Гб видеопамяти.	f
26	Частота видеопамяти	Частота видеопамяти характеризует количество выполняемых в секунду операций. Чем выше частота, тем эффективнее работает память. Соответственно, повышается общая производительность видеокарты. Ввиду особенностей архитектуры памяти GDDR5/GDDR5X/GDDR6/GDDR6X частота может указываться как реальная, так и эффективная, которая в несколько раз выше реальной.	f
27	Шина памяти (разрядность)	Разрядность шины данных определяет количество информации, которое можно передать за один такт. От разрядности шины данных во многом зависит эффективность работы видеопамяти. При выборе видеокарты не всегда стоит отталкиваться только от объёма видеопамяти. Можно учитывать еще её тип и разрядность шины. Например, видеокарта с памятью 8Гб GDDR5 на шине 128 бит будет менее производительна, чем видеокарта с такой же памятью и объёмом, но на шине 256 бит.	f
28	Разъёмы	Разъёмы, к которым подключается устройство вывода видеосигнала (монитор, проектор, телевизор, видеоочки). Разъёмы бывают цифровыми (HDMI, DisplayPort, DVI-D, Type-C) аналоговыми (VGA, DVI-A) и комбинированными (DVI-I, DMS-59). В настоящее время наиболее часто используются разъёмы HDMI и DisplayPort. Аналоговые и комбинированные разъёмы встречаются всё реже и реже.	f
29	Подсветка	Подсветка элементов видеокарты. Выполняет исключительно эстетическую функцию.	f
30	Количество модулей в комплекте	Количество модулей памяти, поставляющихся в комплекте. Использование комплекта из нескольких модулей приводит к увеличению скорости работы при установке многоканального режима. На сегодняшний день наиболее распространён двухканальный режим. Процессоры Intel на Socket 2066 и AMD на Socket sTRX4 поддерживают четырёхканальный режим, а Intel на Socket 3647 - шестиканальный.	f
31	Пропускная способность	Количество передаваемой информации в секунду. Этот параметр напрямую зависит от тактовой частоты памяти. Чем выше пропускная способность, тем эффективнее работает память и выше общая производительность системы.	f
32	CAS Latency (CL)	CAS Latency (CL) - это количество тактов от момента запроса до выдачи запрашиваемых данных. Чем меньше значение CL, тем быстрее работает память.	f
33	RAS to CAS Delay (tRCD)	RAS to CAS Delay (tRCD) - число тактов между открытием строки и доступом к столбцам в ней.	f
34	Row Precharge Delay (tRP)	Row Precharge Delay (tRP) - количество тактов, необходимое для повторной выдачи сигнала RAS.	f
35	Напряжение питания	Напряжение, необходимое для нормальной работы оперативной памяти. Стандартное напряжение для модулей DDR5 составляет 1.1 вольт, для DDR4 - 1.2 вольт, для DDR3 - 1.5 или 1.35 вольт. Определённые модули требуют повышенного напряжения для функционирования на заявленных характеристиках. При выборе памяти нужно убедиться, что материнская плата поддерживает требуемое напряжение.	f
36	Поддержка EXPO	Расширенные профили разгона памяти разработанные компанией AMD	f
37	Поддержка XMP	Профиль XMP - это расширенный набор настроек памяти, как правило, с повышенными частотами, пониженными таймингами и т.д. Профили XMP не являются стандартизированными и задаются производителем отдельно для каждого типа модулей. Для активации XMP профиля требуется материнская плата с поддержкой данной опции.	f
38	Система охлаждения	Многие модули памяти, работающие на повышенных частотах и напряжениях, требуют дополнительного охлаждения для нормального функционирования. Охлаждение модулей памяти обычно реализуется установкой на них радиаторов. При сборке системы с массивной системой охлаждения процессора важно учитывать высоту модулей памяти с радиаторами, так как они могут препятствовать установке системы охлаждения на процессор.	f
39	Назначение	Область применения накопителя. Внутренние накопители устанавливаются в компьютер и служат для повседневной работы с информацией, а также для её хранения. Внешние накопители можно использовать для увеличения дискового пространства ПК, хранения информации, переноса большого количества данных с одного компьютера на другой, а также подключать к медиаплеерам для воспроизведения медиаконтента.	f
40	Тип	SSD (твердотельные накопители) используют флеш-память и не имеют движущихся частей, что обеспечивает им бесшумность и высокую производительность, в несколько раз превосходящую HDD.\n\nЖёсткие диски (HDD) записывают данные на магнитные диски с помощью считывающих головок. Их главные преимущества — большой объём при низкой стоимости и надёжность. Однако HDD уязвимы к тряске и ударам во время работы из-за своей механической конструкции.	f
41	Поддержка NVMe	NVMe (NVMHCI, Non-Volatile Memory Host Controller Interface Specification) – это стандарт подключения накопителей, который использует сверхбыструю шину PCI Express, вместо более медленного интерфейса SATA.	f
42	Скорость чтения	Скорость, с которой происходит чтение данных с накопителя. Для SSD-накопителей часто указывается как скорость чтения, так и скорость записи, а для классических жёстких дисков обычно указывается только внутренняя скорость передачи данных. Чем выше скорость чтения, тем отзывчивее работает система. Быстрее загружается операционная система, быстрее открываются приложения и копируются файлы.	f
43	Скорость записи	Скорость, с которой происходит запись данных на накопитель. Для SSD-накопителей часто указывается как скорость чтения, так и скорость записи, а для классических жёстких дисков обычно указывается только внутренняя скорость передачи данных. Увеличение скорости записи снижает время копирования файлов и повышает общую производительность системы.	f
44	Тип флэш-памяти	Тип флеш-памяти, применяемый в SSD-накопителях. На сегодняшний день наиболее распространены SSD-накопители, основанные на энергонезависимой памяти NAND. Память NAND делится на 4 основных типа: MLC, SLC, TLC и QLC. Модули MLC являются более ёмкими, но время доступа к ним выше, и количество циклов записи гораздо меньше, чем у SLC. TLC обладают большей плотностью записи, но меньшим ресурсом и скоростью по сравнению с SLC и MLC.	f
45	Объём кэш памяти	SSD-накопители используют электронные чипы для хранения данных, а не вращающиеся магнитные диски, как это происходит в жёстких дисках. Буфер в SSD-накопителях называется кэш памятью. Он представляет собой небольшой объем быстрой оперативной памяти, которая используется для временного хранения данных, которые должны быть записаны на накопитель или прочитаны с него. Кэш-память SSD-накопителя помогает ускорить процесс чтения и записи данных, так как она может временно хранить данные, которые часто запрашиваются, и быстро предоставлять их при запросе. Кроме того, кэш-память может использоваться для оптимизации процесса записи данных, чтобы минимизировать количество операций записи на флеш-память и повысить её срок службы.	f
\.


--
-- Data for Name: delivery_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_types (id, delivery_type_name, description) FROM stdin;
1	Курьер	Доставка курьером по адресу
2	Самовывоз	Самовывоз из пункта выдачи
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.favorites (id, user_id, product_id, added_at) FROM stdin;
30	12	1	2025-11-17 16:02:17.215434
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, unit_price) FROM stdin;
27	26	6	8	8970.00
28	27	1	1	33440.00
29	28	2	1	136530.00
30	29	1	1	33440.00
31	30	9	1	9180.00
32	31	1	1	33440.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, user_id, order_date, total_amount, status_order_id, address_id, delivery_types_id, payment_types_id) FROM stdin;
26	№809058	11	2025-11-14 22:23:40	71760.00	4	\N	2	1
27	№759026	11	2025-11-14 23:31:29	34698.80	4	3	1	2
28	№647881	12	2025-11-14 23:47:03	136530.00	4	\N	2	1
29	№576755	12	2025-11-14 23:50:29	34108.80	4	\N	2	2
31	№763365	12	2025-11-17 13:03:13	34108.80	1	\N	2	2
30	№403434	12	2025-11-15 12:24:44	9180.00	4	\N	2	1
\.


--
-- Data for Name: payment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_types (id, payment_type_name, description) FROM stdin;
1	Наличные	Оплата наличными при получении
2	Карта	Оплата картой онлайн
\.


--
-- Data for Name: product_characteristic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_characteristic (id, product_id, characteristic_id, description, deleted) FROM stdin;
1	1	1	AM5	f
2	1	2	8	f
3	1	3	4200 МГц	f
4	1	4	5000 МГц	f
5	1	5	Raphael	f
6	1	6	8 Мб	f
7	1	7	96 Мб	f
8	1	8	Radeon Graphics	f
9	1	9	5 нм	f
10	1	10	120 Вт	f
11	1	11	162 Вт	f
13	3	11	ATX	f
14	3	1	AM5	f
15	3	13	AMD X870E	f
16	3	14	4	f
17	3	15	DDR5	f
18	3	16	PCI-E 5.0 x16, PCI-E 4.0 x16, 4 x PCI-E M.2	f
19	3	17	5 Gigabit Ethernet (5 Гбит/с), Wi-Fi, Bluetooth	f
20	3	18	2 x USB 2.0, 6 x USB 3.2 Gen1, 3 x USB 3.2 Gen2, USB 3.2 Gen2 Type-C, 2 x USB 4 Type-C, HDMI, RJ-45, S/PDIF (оптический)	f
21	2	19	PCI Express 5.0	f
22	2	20	2295 МГц	f
23	2	21	2730 МГц	f
24	2	22	16 Гб	f
25	2	15	GDDR7	f
26	2	26	30000 МГц	f
27	2	27	256 бит	f
28	2	28	HDMI, 3 x DisplayPort	f
29	2	29	да	f
30	4	22	32 Гб	f
31	4	30	2	f
32	4	15	DDR5	f
33	4	31	48000 Мб/с	f
34	4	32	30	f
35	4	33	40	f
36	4	34	40	f
37	4	35	1.35 В	f
38	4	36	да	f
39	4	37	да	f
40	4	38	пассивная (радиатор)	f
41	4	29	да	f
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name_product, article, description, price, stock_quantity, category_id, supplier_id, image_url, sales_count, deleted) FROM stdin;
3	Материнская плата ASUS ROG STRIX X870E-H GAMING WIFI7	947799	Погрузитесь в новую эру высокопроизводительных вычислений с материнской платой ASUS ROG STRIX X870E-H GAMING WIFI7. Этот флагманский продукт, созданный для истинных ценителей игр и творческих профессионалов, построен на передовой платформе AMD AM5 и готов раскрыть невероятный потенциал процессоров Ryzen серии 7000 и будущих поколений. Инженеры ASUS предусмотрели все для обеспечения исключительной мощности, скорости и надежности, делая эту плату идеальным фундаментом для самого требовательного ПК.\n\nСердцем системы является мощная 16+2+1 фазная схема питания, дополненная массивными радиаторами, которые эффективно рассеивают тепло даже при экстремальных нагрузках. Это гарантирует стабильность и производительность при разгоне, позволяя вам выжимать максимум из вашего процессора без каких-либо компромиссов. Для оперативной памяти предусмотрены четыре слота DDR5 с поддержкой технологии AMD EXPO, что обеспечивает мгновенный разгон ОЗУ до заветных частот одним кликом и работу с огромными объемами данных до 256 ГБ, что критически важно для современных игр, работы с виртуальными машинами и монтажа видео сверхвысокого разрешения.\n\nСкорость хранения данных и графики выходит на принципиально новый уровень благодаря обилию интерфейсов PCIe 5.0. Два выделенных слота M.2 поддерживают накопители нового поколения, обеспечивая беспрецедентную скорость передачи данных, что dramatically сокращает время загрузки приложений и уровней в играх. Дополнительные два слота M.2 на базе PCIe 4.0 предоставляют ample пространство для создания быстрого и вместительного хранилища. Видеокарта получает всю необходимую пропускную способность через основной слот PCIe 5.0 x16, готовый к работе с самыми мощными графическими ускорителями как настоящего, так и будущего.\n\nПодключение — это ключевое преимущество платы ROG STRIX X870E-H. Она оснащена двумя портами USB4® Type-C, каждый из которых предлагает скорость до 40 Гбит/с для подключения сверхбыстрых внешних накопителей и мониторов. Дополняет картину сетевой контроллер 5 Gigabit Ethernet и новейший беспроводной модуль Wi-Fi 7, который обеспечивает максимально стабильное соединение с минимальными задержками для комфортной игры по сети и потоковой передачи контента в наивысшем качестве. Звуковая система на базе кодека Realtek ALC1220P с технологией Savitech SV3H712 AMP гарантирует кристально чистое аудио с детализацией каждого звука, что жизненно необходимо для полного погружения в игровую атмосферу или для тонкой звукорежиссуры.	40590.00	30	3	3	https://storage.yandexcloud.net/soratech/%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D0%BB%D0%B0%D1%82%D1%8B/ASUS%20ROG%20STRIX%20X870E-H%20GAMING%20WIFI7.png	3	f
9	Корпус Lian Li O11 Dynamic Mini V2 Black	238589	Представьте идеальный корпус для вашего следующего ПК, где бескомпромиссная производительность встречается с элегантным дизайном. Lian Li O11 Dynamic Mini V2 Black — это не просто корпус, это фундамент для произведения искусства, тщательно продуманная среда для демонстрации самых смелых сборок. Он берет культовый дизайн оригинальной серии O11 и доводит его до совершенства в более компактном формате, предлагая невероятную гибкость и потрясающую эстетику.\n\nС первого взгляда O11 Dynamic Mini V2 покоряет своим фирменным «аквариумным» дизайном. Панорамное закаленное стекло на лицевой и боковой панелях открывает беспрепятственный вид на все внутренние компоненты, превращая ваш компьютер в центральный элемент интерьера. Каждый элемент вашей сборки, от материнской платы с подсветкой до мощной видеокарты, становится частью экспозиции. Черный цвет, доминирующий в оформлении, придает корпусу солидный и стильный вид, который подчеркивает световые эффекты компонентов, а не перетягивает на себя внимание.\n\nНесмотря на статус Mini-Tower, внутреннее пространство корпуса поражает своим размахом. Он с легкостью принимает материнские платы стандартов ATX, mATX и Mini-ITX, предоставляя свободу выбора без ограничений. Блок питания стандарта ATX устанавливается в верхнем отсеке, что является ключевой особенностью конструкции, освобождающей ценное пространство в нижней части корпуса для организации безупречного воздушного потока или монтажа системы жидкостного охлаждения. Максимальная длина видеокарты составляет 460 мм, что достаточно даже для самых крупных современных графических ускорителей, а высота процессорного кулера может достигать 160 мм.\n\nГибкость конфигурации систем охлаждения — это настоящая сверхспособность O11 Dynamic Mini V2. Корпус предлагает невероятные возможности для создания мощной системы охлаждения. Нижняя панель может вместить до трех вентиляторов 120 мм, обеспечивая подачу холодного воздуха непосредственно к видеокарте. На верхней панели можно установить радиатор размером до 360 мм, а на боковой — радиатор 240 мм. Дополнительные места для вентиляторов на задней и боковой панелях позволяют создать сбалансированную и эффективную систему с положительным давлением, что гарантирует низкие температуры и защиту от пыли. Для хранения данных предусмотрены два конвертируемых отсека для накопителей формата 3.5" или 2.5", а также два дополнительных слота для SSD.\n\nФункциональность продумана до мелочей. На лицевой панели расположен современный набор портов: два высокоскоростных USB 3.0, разъем USB Type-C для подключения новейших устройств и комбинированный аудиовыход. Корпус поддерживает материнские платы с технологией скрытого подключения (Back Connect), что позволяет аккуратно спрятать основные кабели за платой, создавая безупречно чистое и организованное внутреннее пространство без видимых проводов. Пылевой фильтр на нижней панели легко доступен для регулярного обслуживания. Lian Li O11 Dynamic Mini V2 — это воплощение инженерной мысли, где каждый элемент служит одной цели: дать вам возможность построить не просто компьютер, а идеальную, мощную и невероятно красивую систему.\n\nУважаемые покупатели! Пожалуйста, проверяйте описание товара на официальном сайте производителя перед покупкой. Уточняйте спецификацию, наличие на складе и цену у менеджеров интернет-магазина. Внешний вид, комплектация и характеристики могут быть изменены производителем без предварительного уведомления.	9180.00	11	9	9	https://storage.yandexcloud.net/soratech/%D0%9A%D0%BE%D1%80%D0%BF%D1%83%D1%81%D0%B0/Lian%20Li%20O11%20Dynamic%20Mini%20V2%20Black.png	1	f
1	Процессор AMD Ryzen 7 7800X3D OEM	498453	Процессор AMD Ryzen 7 7800X3D OEM - это мощное вычислительное устройство, которое позволит вам насладиться высокой производительностью и отличными игровыми возможностями.\n\nЭтот процессор принадлежит линейке Ryzen 7 и имеет модель 7800X3D. Он оснащен сокетом AM5 и архитектурой Zen 4, что обеспечивает высокую эффективность работы и отличное энергосбережение. Ядро процессора называется Raphael, а количество ядер составляет 8, что позволяет выполнять множество задач одновременно. Количество потоков - 16, что делает процессор идеальным выбором для многозадачных операций.\n\nОбъем кэша L1 составляет 512 Кб, кэша L2 - 8 Мб и кэша L3 - 96 Мб, что обеспечивает быстрый доступ к данным и значительно повышает производительность устройства. Встроенный видеопроцессор Radeon Graphics обеспечивает высокое качество графики и плавную работу при запуске игр и мультимедийных приложений.\n\nТехнологический процесс процессора AMD Ryzen 7 7800X3D OEM составляет 5 нм, что гарантирует высокую эффективность и низкое энергопотребление устройства. Тип поставки - OEM, что означает, что процессор поставляется без дополнительных аксессуаров и упаковки, но с полной гарантией производителя.\n\nБлагодаря высокой производительности, низкому энергопотреблению и отличным игровым возможностям, процессор AMD Ryzen 7 7800X3D OEM станет отличным выбором для тех, кто ценит качество и эффективность работы своего компьютера. Позвольте себе насладиться быстрой и плавной работой устройства с этим мощным процессором от AMD.	33440.00	23	1	1	https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png	104	f
4	Оперативная память 32Gb DDR5 6000MHz ADATA XPG Lancer Blade RGB Black (AX5U6000C3016G-DTLABRBK) (2x16Gb KIT)	636343	Оперативная память 32Gb DDR5 6000MHz ADATA XPG Lancer Blade RGB Black (AX5U6000C3016G-DTLABRBK) - это высококачественный продукт, который обеспечивает быструю и стабильную работу вашего компьютера. Этот набор состоит из двух модулей по 16 Гб каждый, общий объем памяти составляет 32 Гб, что обеспечивает достаточно места для запуска самых требовательных приложений и игр.\n\nЭта память имеет форм-фактор DIMM и работает на новейшей технологии DDR5, что обеспечивает высокую производительность и энергоэффективность. Тактовая частота этого набора составляет 6000 МГц, что делает его одним из самых быстрых на рынке. Пропускная способность составляет 48000 Мб/с, что гарантирует быструю передачу данных и плавную работу системы.\n\nКроме того, эта оперативная память имеет низкую задержку CAS Latency (CL) в 30 тактов, а также RAS to CAS Delay (tRCD) и Row Precharge Delay (tRP) в 40 тактов каждый, что обеспечивает быструю обработку данных и минимизацию задержек.\n\nСистема охлаждения этой памяти выполнена в виде пассивного радиатора, который обеспечивает эффективное отвод тепла и защиту от перегрева. Это позволяет поддерживать стабильную работу памяти даже при высоких нагрузках и продлевает ее срок службы.\n\nКроме того, этот набор оперативной памяти имеет стильный дизайн с подсветкой RGB, которая добавит вашему компьютеру эксклюзивный и современный вид. Вы сможете настроить подсветку в соответствии с вашими предпочтениями и создать уникальный внешний вид вашей системы.\n\nВ целом, оперативная память 32Gb DDR5 6000MHz ADATA XPG Lancer Blade RGB Black (AX5U6000C3016G-DTLABRBK) является отличным выбором для тех, кто ценит высокую производительность, надежность и стильный дизайн. Этот продукт обеспечивает высокую производительность и стабильную работу вашего компьютера в любых условиях.	18910.00	25	4	4	https://storage.yandexcloud.net/soratech/%D0%9E%D0%BF%D0%B5%D1%80%D0%B0%D1%82%D0%B8%D0%B2%D0%BD%D0%B0%D1%8F%20%D0%BF%D0%B0%D0%BC%D1%8F%D1%82%D1%8C/32Gb%20DDR5%206000MHz%20ADATA%20XPG%20Lancer%20Blade%20RGB%20Black%20AX5U6000C3016G-DTLABRBK%202x16Gb%20KIT.png	1	f
6	Жёсткий диск 2Tb SATA-III Seagate Barracuda (ST2000DM008)	117606	Жесткий диск Seagate Barracuda 2TB (ST2000DM008) является идеальным решением для хранения больших объемов данных, обеспечивая вместительность и надежность. С интерфейсом SATA-III и скоростью вращения 7200 об/мин, этот диск предлагает отличную производительность для вашего компьютера или сервера.\n\nОбъем в 2TB позволяет хранить огромное количество файлов – будь то фотографии, видео, музыка или документы. Благодаря высокой скорости передачи данных, загрузка программ и доступ к файлам происходит быстро и эффективно.\n\nПродукт отличается высокой надежностью, что подтверждается долгим сроком службы и стабильностью работы. Seagate Barracuda – это выбор многих профессионалов, ценящих качество и долговечность.\n\nЭтот жесткий диск подходит как для домашних пользователей, так и для профессионалов, которым требуется расширенное дисковое пространство для сложных задач. Он легко устанавливается в большинство настольных компьютеров, делая процесс модернизации простым и удобным.\n\nВыбирая Seagate Barracuda 2TB, вы получаете высокую производительность, надежность и большой объем хранения по доступной цене. Это идеальный вариант для тех, кто ищет эффективное и долгосрочное решение для хранения данных.	8970.00	46	6	6	https://storage.yandexcloud.net/soratech/HDD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/2Tb%20SATA-III%20Seagate%20Barracuda%20(ST2000DM008).png	8	f
5	Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW)	716099	Накопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) - это ультрасовременное решение для хранения данных, которое обеспечивает высокую скорость работы и надежность. Этот накопитель предназначен для установки внутри компьютера и отличается превосходными техническими характеристиками.\n\nТип SSD гарантирует быструю передачу данных и максимальную производительность. Форм-фактор M.2 позволяет установить накопитель без лишних проводов и кабелей, что сделает вашу систему более компактной и эстетичной. Тип флэш-памяти TLC обеспечивает надежность и долговечность накопителя, а объем кэш-памяти 1024 Мб позволяет ускорить процессы чтения и записи данных.\n\nОсновные преимущества накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW):\n- Высокая скорость работы. SSD-накопитель обеспечивает быструю загрузку операционной системы, запуск приложений и передачу файлов.\n- Надежность. Тип флэш-памяти TLC обеспечивает долгий срок службы накопителя и защиту данных от потери.\n- Превосходная производительность. Накопитель Samsung 990 PRO обладает высокой скоростью чтения и записи данных, что делает его идеальным выбором для профессионалов и геймеров.\n- Простота установки. Форм-фактор M.2 позволяет установить накопитель без лиопытных манипуляций.\n\nНакопитель SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) подойдет для использования в качестве системного диска, для хранения медиа-контента или как дополнительное хранилище данных. Благодаря высокой скорости работы и надежности, он станет надежным компаньоном в вашей работе и развлечениях.\n\nНе упустите возможность обновить вашу систему с помощью накопителя SSD 1Tb Samsung 990 PRO (MZ-V9P1T0BW) и наслаждаться быстрой и стабильной работой вашего компьютера.	13100.00	14	5	5	https://storage.yandexcloud.net/soratech/SSD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/SSD%201Tb%20Samsung%20990%20PRO%20(MZ-V9P1T0BW).png	34	f
8	Блок питания 1000W GamerStorm (DeepCool) PN1000M	879255	Блок питания 1000W GamerStorm PN1000M - это мощное и надежное устройство, которое идеально подойдет для сборки игрового компьютера или мощной рабочей станции. Этот блок питания обеспечивает стабильное и эффективное питание вашего оборудования, что позволит вам наслаждаться плавным и бесперебойным функционированием системы.\n\nСтандарт ATX12V 3.1 гарантирует совместимость с большинством современных материнских плат, а активный PFC помогает снизить потребление энергии и повысить эффективность блока питания. Благодаря размеру вентилятора 135 мм ваша система будет охлаждаться эффективно и бесшумно, что особенно важно для геймеров и пользователей, которые ценят тишину работы своего ПК.\n\nТип разъема для материнской платы 20+4 pin обеспечивает удобное подключение блока питания к материнской плате, а два разъема 4+4-pin CPU и три разъема 6+2-pin PCI-E позволят подключить несколько мощных видеокарт или процессоров. Дополнительный разъем 12+4-pin PCI-E 5.1 (12V-2х6) обеспечит дополнительное питание для самой требовательной графики или процессоров.\n\nБлок питания 1000W GamerStorm PN1000M оснащен восемью разъемами 15-pin SATA и двумя разъемами 4-pin IDE (Molex), что позволит подключить большое количество жестких дисков, оптических приводов и других устройств. Кроме того, блок питания имеет сертификаты 80 PLUS Gold и Cybenetics Gold, что гарантирует его высокую энергоэффективность и надежность.\n\nДлина кабеля питания материнской платы 55 см обеспечивает достаточную гибкость и удобство при сборке системы. Блок питания 1000W GamerStorm PN1000M - это идеальный выбор для тех, кто ценит качество, надежность и производительность. Уверенное питание вашего компьютера - залог стабильной и эффективной работы вашей системы.	13170.00	21	8	8	https://storage.yandexcloud.net/soratech/%D0%91%D0%BB%D0%BE%D0%BA%D0%B8%20%D0%BF%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D1%8F/1000W%20GamerStorm%20(DeepCool)%20PN1000M.png	0	f
7	Кулер ID-COOLING SE-226-XT BLACK	449597	ID-COOLING SE-226-XT BLACK - это высококачественный кулер, предназначенный для охлаждения процессора вашего компьютера. Этот активный кулер обеспечивает эффективное охлаждение благодаря своей конструкции и использованию высококачественных материалов.\n\nОдин вентилятор с размерами 120x120 мм обеспечивает достаточный воздушный поток для эффективного охлаждения процессора. Тип подшипника - гидродинамический (FDB), что обеспечивает более долгий срок службы и более тихую работу вентилятора.\n\nID-COOLING SE-226-XT BLACK имеет радиатор из алюминия, который обеспечивает хорошую теплопроводность и эффективное распределение тепла. Основание кулера изготовлено из меди, что обеспечивает хороший теплопровод и эффективное отвод тепла от процессора.\n\nЭтот кулер оснащен регулятором оборотов PWM, который позволяет настраивать скорость вращения вентилятора в зависимости от нагрузки на процессор. Это позволяет достичь оптимального баланса между производительностью и уровнем шума.\n\nID-COOLING SE-226-XT BLACK отличается стильным дизайном в черном цвете, который подойдет к любому современному компьютеру. Его компактные размеры и удобная установка делают его идеальным выбором для сборки ПК любого уровня сложности.\n\nВ итоге, кулер ID-COOLING SE-226-XT BLACK - это надежное и эффективное решение для охлаждения процессора вашего компьютера. Благодаря своим характеристикам и качеству исполнения, он поможет поддерживать стабильную температуру процессора даже в условиях повышенной нагрузки.	3160.00	88	7	7	https://storage.yandexcloud.net/soratech/%D0%9E%D1%85%D0%BB%D0%B0%D0%B6%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5/ID-COOLING%20SE-226-XT%20BLACK.png	1	f
2	Видеокарта NVIDIA GeForce RTX 5080 Gigabyte GAMING OC 16Gb (GV-N5080GAMING OC-16GD)	490788	Современные игры требуют мощных компонентов для плавной и качественной графики. Если вы хотите насладиться игровым процессом на максимальных настройках, то видеокарта NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) - идеальный выбор для вас.\n\nЭта видеокарта оснащена интерфейсом PCI Express 5.0, что обеспечивает высокую скорость передачи данных и позволяет получить максимальную производительность в играх. Производитель видеопроцессора - NVIDIA, а серия - GeForce RTX 5080, что гарантирует высочайшее качество графики и отличную оптимизацию игр.\n\nАрхитектура графического процессора NVIDIA Blackwell в сочетании с 4-нм техпроцессом и объемом памяти 16 Гб типа GDDR7 обеспечивает плавную работу даже в самых требовательных играх. Шина памяти 256 бит гарантирует высокую скорость обработки данных, а количество занимаемых слотов - 3.5, позволяет установить данную видеокарту в большинство современных корпусов.\n\nСистема охлаждения активная с тремя вентиляторами позволяет держать температуру видеокарты на оптимальном уровне, что обеспечивает стабильную работу и высокую производительность даже при длительных игровых сессиях. Количество поддерживаемых мониторов - 4, а максимальное разрешение - 7680x4320, что позволяет наслаждаться играми в потрясающем качестве.\n\nДля подключения видеокарты к системному блоку предусмотрен разъем дополнительного питания 16 pin, что обеспечивает стабильное энергоснабжение и предотвращает сбои в работе. Тип поставки - Retail, что гарантирует официальную гарантию и качество товара.\n\nЕсли вы ищете мощную и качественную видеокарту для игр или профессиональной работы, то NVIDIA GeForce RTX 5080 Gigabyte OC 16Gb (GV-N5080GAMING OC-16GD) станет надежным решением для вас. Получите максимальное удовольствие от игрового процесса и наслаждайтесь потрясающей графикой с этой видеокартой!	136530.00	50	2	2	https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png	78	f
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, product_id, user_id, rating, comment_text, review_date, deleted) FROM stdin;
2	6	11	5.0	Хорошие жёские диски за свою цену!	2025-11-15	f
4	2	12	5.0	Тихая и очень холодая . температуры в играх выше 65 не видел , играю в 2к . ROPсы все на месте .	2025-11-15	f
5	1	12	4.0	достойный камень, который явно мог бы стать лучшим на рынке если бы не цена и скачущая температура	2025-11-15	f
3	1	11	5.0	У самого лучшего процессора самый лучший отзыв	2025-11-15	t
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, role_name) FROM stdin;
1	Администратор
2	Менеджер
3	Клиент
\.


--
-- Data for Name: status_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status_orders (id, status_name) FROM stdin;
1	Ожидает оплаты
2	Оплачен
3	Отправлен
4	Доставлен
5	Отменён
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name_supplier, contact_email, phone, deleted) FROM stdin;
1	AMD	amd@gmail.com	+7 (654) 456-76-87	f
2	Gigabyte	gigabyte@gmail.com	+7 (123) 987-65-43	f
3	ASUS	asus@gmail.com	+7 (876) 345-12-12	f
4	ADATA	adata@gmail.com	+7 (876) 543-12-12	f
5	Samsung	samsung@gmail.com	+7 (567) 456-65-76	f
6	Seagate	seagate@gmail.com	+7 (987) 789-98-98	f
7	ID-COOLING	id-cooling@gmail.com	+7 (567) 876-34-45	f
8	DeepCool	deepcool@gmail.com	+7 (891) 821-89-12	f
9	Lian Li	lianli@gmail.com	+7 (777) 888-99-99	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, role_id, email, password_hash, first_name, nickname, phone, registration_date, deleted, is_dark_theme, currency) FROM stdin;
12	2	yaneytm12.11.20@gmail.com	$2a$06$NbMKJ7MVeNshAziA/hNR1Ol5oAgiWUGfsLnwDR7nPG/1vg5idCb16	Александр	YANEY	+7 (800) 555-35-35	2025-11-15	f	t	RUB
11	1	sanyayt1337@gmail.com	$2a$06$OJMypspkMVHfEozVUvVySu73S1xftXPUxAFXKzt4a9JqgLaV7RclG	Александр	zeshalondrag	+7 (929) 933-94-10	2025-11-13	f	t	USD
\.


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.addresses_id_seq', 3, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 313, true);


--
-- Name: cart_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cart_id_seq', 90, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 13, true);


--
-- Name: characteristic_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.characteristic_id_seq', 45, true);


--
-- Name: delivery_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_types_id_seq', 2, true);


--
-- Name: favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.favorites_id_seq', 30, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 32, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 31, true);


--
-- Name: payment_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_types_id_seq', 2, true);


--
-- Name: product_characteristic_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_characteristic_id_seq', 41, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 10, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_id_seq', 5, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: status_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.status_orders_id_seq', 5, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_key UNIQUE (user_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_category_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_category_key UNIQUE (name_category);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: characteristic characteristic_name_characteristic_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.characteristic
    ADD CONSTRAINT characteristic_name_characteristic_key UNIQUE (name_characteristic);


--
-- Name: characteristic characteristic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.characteristic
    ADD CONSTRAINT characteristic_pkey PRIMARY KEY (id);


--
-- Name: delivery_types delivery_types_delivery_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_types
    ADD CONSTRAINT delivery_types_delivery_type_name_key UNIQUE (delivery_type_name);


--
-- Name: delivery_types delivery_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_types
    ADD CONSTRAINT delivery_types_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_types payment_types_payment_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_types
    ADD CONSTRAINT payment_types_payment_type_name_key UNIQUE (payment_type_name);


--
-- Name: payment_types payment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_types
    ADD CONSTRAINT payment_types_pkey PRIMARY KEY (id);


--
-- Name: product_characteristic product_characteristic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_characteristic
    ADD CONSTRAINT product_characteristic_pkey PRIMARY KEY (id);


--
-- Name: products products_article_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_article_key UNIQUE (article);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: status_orders status_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_orders
    ADD CONSTRAINT status_orders_pkey PRIMARY KEY (id);


--
-- Name: status_orders status_orders_status_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_orders
    ADD CONSTRAINT status_orders_status_name_key UNIQUE (status_name);


--
-- Name: suppliers suppliers_contact_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_contact_email_key UNIQUE (contact_email);


--
-- Name: suppliers suppliers_name_supplier_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_supplier_key UNIQUE (name_supplier);


--
-- Name: suppliers suppliers_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_phone_key UNIQUE (phone);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_nickname_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nickname_key UNIQUE (nickname);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: product_analytics_view _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.product_analytics_view AS
 SELECT pr.id AS "ID",
    pr.article AS "Артикул",
    pr.name_product AS "Название товара",
    pr.price AS "Цена",
    pr.stock_quantity AS "Остаток",
    COALESCE(sum(oi.quantity), (0)::bigint) AS "Продано единиц",
    COALESCE(sum(((oi.quantity)::numeric * oi.unit_price)), (0)::numeric) AS "Выручка",
    c.name_category AS "Категория",
    su.name_supplier AS "Поставщик"
   FROM (((public.products pr
     LEFT JOIN public.order_items oi ON ((pr.id = oi.product_id)))
     LEFT JOIN public.categories c ON ((pr.category_id = c.id)))
     LEFT JOIN public.suppliers su ON ((pr.supplier_id = su.id)))
  GROUP BY pr.id, c.name_category, su.name_supplier
  ORDER BY COALESCE(sum(((oi.quantity)::numeric * oi.unit_price)), (0)::numeric) DESC;


--
-- Name: review_analytics_view _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.review_analytics_view AS
 SELECT pr.id AS "ID",
    pr.article AS "Артикул",
    pr.name_product AS "Название товара",
    avg(r.rating) AS "Средний рейтинг",
    count(r.id) AS "Количество отзывов",
    string_agg(r.comment_text, '; '::text) AS "Комментарии"
   FROM (public.products pr
     LEFT JOIN public.reviews r ON ((pr.id = r.product_id)))
  GROUP BY pr.id, pr.name_product
  ORDER BY (avg(r.rating)) DESC NULLS LAST;


--
-- Name: categories audit_categories; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_categories AFTER INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: order_items audit_order_items; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_order_items AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: orders audit_orders; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_orders AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: product_characteristic audit_product_attributes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_product_attributes AFTER INSERT OR DELETE OR UPDATE ON public.product_characteristic FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: products audit_products; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: reviews audit_reviews; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_reviews AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: suppliers audit_suppliers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_suppliers AFTER INSERT OR DELETE OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: users audit_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_users AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: users trg_generate_guest_nickname; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generate_guest_nickname BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.generate_guest_nickname();


--
-- Name: products trg_generate_product_article; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generate_product_article BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.generate_product_article();


--
-- Name: suppliers trigger_format_supplier_phone; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_format_supplier_phone BEFORE INSERT OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.format_phone();


--
-- Name: users trigger_format_user_phone; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_format_user_phone BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.format_phone();


--
-- Name: orders trigger_set_order_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_number();


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart cart_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart cart_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_log fk_audit_log_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_log_user_id FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- Name: orders orders_delivery_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_types_id_fkey FOREIGN KEY (delivery_types_id) REFERENCES public.delivery_types(id);


--
-- Name: orders orders_payment_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_payment_types_id_fkey FOREIGN KEY (payment_types_id) REFERENCES public.payment_types(id);


--
-- Name: orders orders_status_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_status_order_id_fkey FOREIGN KEY (status_order_id) REFERENCES public.status_orders(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: product_characteristic product_characteristic_characteristic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_characteristic
    ADD CONSTRAINT product_characteristic_characteristic_id_fkey FOREIGN KEY (characteristic_id) REFERENCES public.characteristic(id);


--
-- Name: product_characteristic product_characteristic_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_characteristic
    ADD CONSTRAINT product_characteristic_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: TABLE addresses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.addresses TO admin_role;


--
-- Name: SEQUENCE addresses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.addresses_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.addresses_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.addresses_id_seq TO client_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO admin_role;


--
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.audit_log_id_seq TO client_role;


--
-- Name: TABLE cart; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cart TO admin_role;


--
-- Name: SEQUENCE cart_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.cart_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.cart_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.cart_id_seq TO client_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO admin_role;


--
-- Name: SEQUENCE categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.categories_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.categories_id_seq TO client_role;


--
-- Name: TABLE characteristic; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.characteristic TO admin_role;


--
-- Name: SEQUENCE characteristic_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.characteristic_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.characteristic_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.characteristic_id_seq TO client_role;


--
-- Name: TABLE delivery_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_types TO admin_role;


--
-- Name: SEQUENCE delivery_types_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.delivery_types_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.delivery_types_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.delivery_types_id_seq TO client_role;


--
-- Name: TABLE favorites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.favorites TO admin_role;


--
-- Name: SEQUENCE favorites_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.favorites_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.favorites_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.favorites_id_seq TO client_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO admin_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.orders TO manager_role;
GRANT SELECT ON TABLE public.orders TO client_role;


--
-- Name: TABLE payment_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_types TO admin_role;


--
-- Name: TABLE status_orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.status_orders TO admin_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO admin_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO manager_role;


--
-- Name: TABLE order_analytics_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_analytics_view TO admin_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items TO admin_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO admin_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO manager_role;
GRANT SELECT ON TABLE public.products TO client_role;


--
-- Name: TABLE order_full_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_full_view TO admin_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.order_full_view TO manager_role;
GRANT SELECT ON TABLE public.order_full_view TO client_role;


--
-- Name: SEQUENCE order_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_items_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.order_items_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.order_items_id_seq TO client_role;


--
-- Name: SEQUENCE orders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.orders_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.orders_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.orders_id_seq TO client_role;


--
-- Name: SEQUENCE payment_types_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.payment_types_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.payment_types_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.payment_types_id_seq TO client_role;


--
-- Name: TABLE product_analytics_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_analytics_view TO admin_role;


--
-- Name: TABLE product_characteristic; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_characteristic TO admin_role;


--
-- Name: SEQUENCE product_characteristic_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.product_characteristic_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.product_characteristic_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.product_characteristic_id_seq TO client_role;


--
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO admin_role;


--
-- Name: TABLE product_full_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_full_view TO admin_role;


--
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.products_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.products_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.products_id_seq TO client_role;


--
-- Name: TABLE review_analytics_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.review_analytics_view TO admin_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reviews TO admin_role;


--
-- Name: SEQUENCE reviews_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reviews_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.reviews_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.reviews_id_seq TO client_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO admin_role;


--
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.roles_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.roles_id_seq TO client_role;


--
-- Name: SEQUENCE status_orders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.status_orders_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.status_orders_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.status_orders_id_seq TO client_role;


--
-- Name: SEQUENCE suppliers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.suppliers_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.suppliers_id_seq TO client_role;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO admin_role;
GRANT ALL ON SEQUENCE public.users_id_seq TO manager_role;
GRANT SELECT,USAGE ON SEQUENCE public.users_id_seq TO client_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO manager_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO client_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO admin_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO manager_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO client_role;


--
-- PostgreSQL database dump complete
--

\unrestrict 0BwpGOQ6epJ8bGPXdNIzsA52W7AzUAXbfhvuOJVIkB7oVeIQNDfxNdcD0C8OLwN

