import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { heroSlides } from '@/lib/mockData';
import Autoplay from 'embla-carousel-autoplay';

export const HeroSlider = () => {
  return (
    <section className="relative">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {heroSlides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className="relative h-[400px] md:h-[500px] bg-gradient-hero rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  <div className="container mx-auto px-6 md:px-12">
                    <div className="max-w-2xl">
                      <h2 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                        {slide.title}
                      </h2>
                      <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-fade-in">
                        {slide.subtitle}
                      </p>
                      <Button asChild size="lg" className="animate-scale-in">
                        <Link to={slide.link}>{slide.cta}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </section>
  );
};
